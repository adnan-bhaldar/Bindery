import chalk from "chalk";

// Same palette as the client: deep indigo-slate background, violet accent
const violet = chalk.hex("#8b5cf6");
const violetBold = chalk.hex("#8b5cf6").bold;
const slate = chalk.hex("#94a3b8");
const green = chalk.hex("#4ade80");
const red = chalk.hex("#f87171");
const dim = chalk.hex("#475569");

export const logger = {
  banner: () => {
    console.log(dim("┌─────────────────────────────────┐"));
    console.log(dim("│  ") + violetBold("Bindery") + slate("  ·  server") + dim("        │"));
    console.log(dim("└─────────────────────────────────┘"));
  },
  success: (msg) => console.log(green("✓"), slate(msg)),
  info: (msg) => console.log(violet("›"), slate(msg)),
  warn: (msg) => console.log(chalk.hex("#facc15")("!"), slate(msg)),
  error: (msg) => console.log(red("✗"), red(msg)),
  ready: (port) => {
    console.log();
    console.log(green("✓"), slate("server running at"), violetBold(`http://localhost:${port}`));
    console.log();
  },
};
