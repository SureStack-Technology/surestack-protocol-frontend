import { useEffect, useMemo, useRef, useState } from 'react'
import { ethers } from 'ethers'
import { getResilientProvider } from '../utils/resilientProvider'
import aggregatorAbi from '../abi/AggregatorV3Interface.json'
import { idbGet, idbSet } from '../utils/idb'

const INTERVAL_CONFIG = {
  '5m':  { points: 60 }, '30m': { points: 60 }, '1h': { points: 60 },
  '1d':  { points: 30 }, '5d':  { points: 5 },  '7d': { points: 7 },
  '1mo': { points: 30 }, '1y':  { points: 12 },
}

function fmtLabel(ts, intervalKey){
  const d = new Date(ts)
  const long = intervalKey.includes('d') || intervalKey.includes('y') || intervalKey==='1mo'
  return long ? d.toLocaleDateString() : d.toLocaleTimeString()
}

/** 
 * Live Chainlink ETH/USD (Sepolia)
 * Polls every 30 s; stores readings in IndexedDB; emits a "oracle-pulse" DOM event on update
 */
export function useChainlinkOracle({ intervalKey='5m', rpcUrl, aggregator }){
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({ price:null, updatedAt:null, roundId:null, decimals:8 })
  const [error, setError] = useState(null)
  const timerRef = useRef(null)

  const provider = useMemo(()=>{
    if (rpcUrl) {
      // Use provided RPC URL if specified
      return new ethers.JsonRpcProvider(rpcUrl)
    }
    try {
      // Use resilient provider with automatic fallback
      return getResilientProvider()
    } catch (err) {
      console.warn('[useChainlinkOracle] No RPC URL found, using fallback')
      const fallbackUrl = import.meta.env.VITE_SEPOLIA_RPC || import.meta.env.VITE_ALCHEMY_RPC
      if (!fallbackUrl) {
        return null
      }
      return new ethers.JsonRpcProvider(fallbackUrl)
    }
  }, [rpcUrl])

  const contract = useMemo(()=>{
    if (!provider) return null
    const addr = aggregator || import.meta.env.VITE_CHAINLINK_ETHUSD
    if (!addr) {
      console.warn('[useChainlinkOracle] No Chainlink address found')
      return null
    }
    return new ethers.Contract(addr, aggregatorAbi, provider)
  }, [aggregator, provider])

  async function readLatest(){
    if (!contract) throw new Error('Contract not initialized')
    const [rid, ans, , updatedAt] = await contract.latestRoundData()
    const dec = await contract.decimals()
    const price = Number(ethers.formatUnits(ans, dec))
    return { roundId:Number(rid), price, updatedAt:Number(updatedAt)*1000, decimals:dec }
  }

  async function readRound(rid){
    if (!contract) throw new Error('Contract not initialized')
    const [id, ans, , updatedAt] = await contract.getRoundData(rid)
    return { roundId:Number(id), price:Number(ans), updatedAt:Number(updatedAt)*1000 }
  }

  async function backfill(latest, need){
    if (!contract) return []
    const pts=[]; let id=latest.roundId; let c=0
    while(c<need && id>0){
      try{
        const r=await readRound(id)
        if(!r.updatedAt||r.price===0) break
        pts.push(r); id--; c++
      }catch{break}
    }
    const dec=latest.decimals
    return pts.sort((a,b)=>a.updatedAt-b.updatedAt)
      .map(p=>({ time:fmtLabel(p.updatedAt,intervalKey),
                 price:Number(ethers.formatUnits(p.price,dec)) }))
  }

  async function loadCached(){ 
    const key=`oracle:${intervalKey}`; 
    const c=await idbGet(key); 
    if(c) setRows(c) 
  }

  async function syncNow(){
    if (!contract || !provider) {
      setError('Contract or provider not initialized')
      return
    }
    try{
      setError(null)
      const conf=INTERVAL_CONFIG[intervalKey]||INTERVAL_CONFIG['5m']
      const latest=await readLatest()
      setMeta(latest)
      const back=await backfill(latest,conf.points)
      const final=[...back,{time:fmtLabel(latest.updatedAt,intervalKey),price:latest.price}]
      setRows(final)
      await idbSet(`oracle:${intervalKey}`,final)
      await idbSet('oracle:latest',latest)
      // 🔄 trigger UI pulse
      document.dispatchEvent(new CustomEvent('oracle-pulse'))
    }catch(e){
      console.error('[useChainlinkOracle] sync error:',e)
      setError(e.message||'Oracle read failed')
    }
  }

  useEffect(()=>{
    if (!contract || !provider) {
      loadCached()
      return
    }
    loadCached(); syncNow()
    timerRef.current=setInterval(syncNow,30_000)   // 30 s polling
    return ()=>clearInterval(timerRef.current)
  },[intervalKey, contract, provider])

  return { rows, meta, error, refresh:syncNow }
}




