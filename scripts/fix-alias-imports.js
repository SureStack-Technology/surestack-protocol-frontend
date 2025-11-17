const fs = require("fs");
const path = require("path");
const { glob } = require("glob");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.resolve(PROJECT_ROOT, "src");
const REPORT_FILE = path.resolve(PROJECT_ROOT, "alias-fix-report.txt");

// Mapping of alias to actual directory path
const aliasToPath = {
  "@": path.resolve(PROJECT_ROOT, "src"),
  "@shared": path.resolve(PROJECT_ROOT, "src/shared"),
  "@components": path.resolve(PROJECT_ROOT, "src/components"),
  "@hooks": path.resolve(PROJECT_ROOT, "src/shared/hooks"),
  "@utils": path.resolve(PROJECT_ROOT, "shared/utils"),
  "@shared-utils": path.resolve(PROJECT_ROOT, "shared/utils"),
  "@config": path.resolve(PROJECT_ROOT, "src/config"),
  "@contexts": path.resolve(PROJECT_ROOT, "src/contexts"),
  "@abis": path.resolve(PROJECT_ROOT, "src/abis"),
};

// Common alias fixes (wrong → correct)
const aliasFixes = [
  // Fix @components/layouts → @/layouts (if layouts is at src/layouts)
  {
    pattern: /@components\/layouts/g,
    replacement: "@/layouts",
    reason: "layouts is at src/layouts, not src/components/layouts",
  },
  {
    pattern: /@\/components\/layouts/g,
    replacement: "@/layouts",
    reason: "layouts is at src/layouts, not src/components/layouts",
  },
  // Fix any @components/../ imports that should be @/
  {
    pattern: /@components\/\.\.\//g,
    replacement: "@/",
    reason: "Parent directory should use @/ alias",
  },
];

const fixedImports = [];
const warnings = [];
const errors = [];

/**
 * Verify that an import path resolves to an existing file/directory
 */
function verifyImportPath(importPath, filePath) {
  // Extract alias and subpath from import
  const aliasMatch = importPath.match(/^(@[^/]+)(?:\/(.+))?/);
  if (!aliasMatch) return true; // Not an alias import, skip

  const [, alias, subpath] = aliasMatch;
  const basePath = aliasToPath[alias];

  if (!basePath) {
    warnings.push(`[${filePath}] Unknown alias: ${alias}`);
    return false;
  }

  if (!fs.existsSync(basePath)) {
    errors.push(`[${filePath}] Alias ${alias} points to non-existent path: ${basePath}`);
    return false;
  }

  // If there's a subpath, check if it exists
  if (subpath) {
    const fullPath = path.resolve(basePath, subpath);
    // Check both as file and as directory (for index files)
    const existsAsFile = fs.existsSync(fullPath) || fs.existsSync(fullPath + ".js") || fs.existsSync(fullPath + ".jsx");
    const existsAsDir = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
    
    if (!existsAsFile && !existsAsDir) {
      warnings.push(`[${filePath}] Import path may not exist: ${importPath} (resolved to: ${fullPath})`);
      return false;
    }
  }

  return true;
}

/**
 * Extract all import statements from code
 */
function extractImports(code) {
  const imports = [];
  // Match import statements
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?["']([^"']+)["']/g;
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

/**
 * Main fix function
 */
function fixAliasImports() {
  console.log("[AliasFix] 🔍 Scanning files for alias imports...\n");

  // Get all source files
  const files = glob.sync(`${SRC_DIR}/**/*.{js,jsx,ts,tsx}`, {
    ignore: ["**/node_modules/**", "**/dist/**"],
  });

  console.log(`[AliasFix] Found ${files.length} files to check\n`);

  for (const file of files) {
    let code = fs.readFileSync(file, "utf8");
    const original = code;
    const relativePath = path.relative(PROJECT_ROOT, file);

    // Apply alias fixes
    for (const fix of aliasFixes) {
      if (fix.pattern.test(code)) {
        code = code.replace(fix.pattern, fix.replacement);
        console.log(`[AliasFix] ✅ Fixed in ${relativePath}: ${fix.reason}`);
      }
    }

    // Verify all imports
    const imports = extractImports(code);
    for (const importPath of imports) {
      if (importPath.startsWith("@")) {
        verifyImportPath(importPath, relativePath);
      }
    }

    // Write back if changed
    if (code !== original) {
      fs.writeFileSync(file, code, "utf8");
      fixedImports.push({
        file: relativePath,
        changes: code !== original,
      });
    }
  }

  // Generate report
  const report = [
    `Alias Fix Report — ${new Date().toISOString()}`,
    "=".repeat(60),
    "",
    `Files Scanned: ${files.length}`,
    `Files Fixed: ${fixedImports.length}`,
    `Warnings: ${warnings.length}`,
    `Errors: ${errors.length}`,
    "",
  ];

  if (fixedImports.length > 0) {
    report.push("✅ Fixed Files:");
    report.push("-".repeat(60));
    fixedImports.forEach(({ file }) => {
      report.push(`  ✅ ${file}`);
    });
    report.push("");
  }

  if (warnings.length > 0) {
    report.push("⚠️  Warnings:");
    report.push("-".repeat(60));
    warnings.forEach((warning) => {
      report.push(`  ${warning}`);
    });
    report.push("");
  }

  if (errors.length > 0) {
    report.push("❌ Errors:");
    report.push("-".repeat(60));
    errors.forEach((error) => {
      report.push(`  ${error}`);
    });
    report.push("");
  }

  if (fixedImports.length === 0 && warnings.length === 0 && errors.length === 0) {
    report.push("✅ No alias fixes required. All imports are correct!");
  }

  // Write report
  fs.writeFileSync(REPORT_FILE, report.join("\n"), "utf8");

  // Console summary
  console.log("\n" + "=".repeat(60));
  console.log("[AliasFix] ✅ Completed");
  console.log(`  Files scanned: ${files.length}`);
  console.log(`  Files fixed: ${fixedImports.length}`);
  console.log(`  Warnings: ${warnings.length}`);
  console.log(`  Errors: ${errors.length}`);
  console.log(`  Report: ${REPORT_FILE}`);
  console.log("=".repeat(60));

  if (errors.length > 0) {
    console.error("\n❌ Errors found! Please review the report.");
    process.exit(1);
  }
}

// Run the fix
try {
  fixAliasImports();
} catch (err) {
  console.error("[AliasFix] ❌ Error:", err);
  process.exit(1);
}

