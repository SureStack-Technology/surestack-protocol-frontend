/**
 * Shared loading / profile-sync UI for auth guards and post-sign-in routing.
 */

function AuthSpinner() {
  return <div className="h-10 w-10 border-2 border-safe/30 border-t-safe rounded-full animate-spin" aria-hidden />
}

export function AuthSessionShell({ message = 'Loading session…', submessage }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-void text-safe gap-4 px-6 text-center">
      <AuthSpinner />
      <p className="text-sm text-slate-200 font-mono uppercase tracking-[0.2em]">{message}</p>
      {submessage ? <p className="text-xs text-slate-500 max-w-md leading-relaxed">{submessage}</p> : null}
    </div>
  )
}

export function ProfileSyncShell({ onRetry, errorCode, hint }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-void text-safe gap-4 px-6 text-center">
      <AuthSpinner />
      <p className="text-sm text-slate-200 font-mono uppercase tracking-[0.2em]">Syncing your SureStack profile…</p>
      <p className="text-xs text-slate-500 max-w-md leading-relaxed">
        {errorCode
          ? `We could not load your account yet (${errorCode}). This usually clears in a few seconds.`
          : 'Connecting your Clerk session to SureStack…'}
      </p>
      {hint ? <p className="text-[11px] text-slate-500 max-w-md leading-relaxed">{hint}</p> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-lg border border-violet-500/40 bg-violet-500/10 px-4 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-500/20"
        >
          Retry sync
        </button>
      ) : null}
    </div>
  )
}
