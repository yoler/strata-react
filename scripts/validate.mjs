import { execSync } from "node:child_process";

const commands = ["npm run lint", "npm run build"];

for (const command of commands) {
  try {
    console.log(`\n> ${command}`);
    execSync(command, { stdio: "inherit" });
  } catch (error) {
    process.exit(1);
  }
}
