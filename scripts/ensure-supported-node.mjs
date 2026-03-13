const SUPPORTED_NODE_MAJOR = 22;
const [majorText = ""] = process.versions.node.split(".");
const activeMajor = Number.parseInt(majorText, 10);

if (activeMajor !== SUPPORTED_NODE_MAJOR) {
  console.error(
    [
      "CourtBoard requires Node 22.x for development, build, and production parity.",
      `Detected Node ${process.versions.node}.`,
      "Switch to Node 22, then reinstall dependencies so better-sqlite3 matches the active runtime.",
      "If you do not want a local Node toolchain, use the provided Docker workflow instead.",
    ].join("\n"),
  );
  process.exit(1);
}

console.log(`Node runtime verified: ${process.versions.node}`);
