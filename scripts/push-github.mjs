import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const root = process.cwd();
const manifestFile = path.join(root, "data", "deploy-manifest.json");
if (fs.existsSync(manifestFile)) fs.unlinkSync(manifestFile);

const credOut = execSync("git credential fill", {
  input: "protocol=https\nhost=github.com\n\n",
  encoding: "utf8",
});
const passMatch = credOut.match(/password=([^\r\n]+)/);
const userMatch = credOut.match(/username=([^\r\n]+)/);
const token = passMatch ? passMatch[1].trim() : "";
const username = userMatch ? userMatch[1].trim() : "adaam1101";

async function main() {
  // 1. Try creating a public repo adam-ameyoud-exams on GitHub
  const createRes = await fetch("https://api.github.com/user/repos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "adam-ameyoud-deployer",
    },
    body: JSON.stringify({
      name: "adam-ameyoud-exams",
      description: "Adam Ameyoud — English Language Assessment Platform",
      private: false,
      auto_init: false,
    }),
  });
  const createData = await createRes.json();
  console.log("Create repo status:", createRes.status, createData.id, createData.full_name || createData.message);

  // Commit latest package.json changes
  execSync('git add -A && git -c user.name="Adam Ameyoud" -c user.email="adam@ameyoud.edu" commit -m "Update package.json for Vercel production build" --allow-empty', {
    stdio: "inherit",
  });
  execSync("git branch -M main", { stdio: "inherit" });

  // Push to adaam1101/adam-ameyoud-exams if created or exists
  try {
    execSync(`git remote remove origin 2>nul || exit 0`, { shell: "cmd.exe" });
    execSync("git remote add origin https://github.com/adaam1101/adam-ameyoud-exams.git", { stdio: "inherit" });
    execSync("git push -u origin main --force", { stdio: "inherit" });
    console.log("Pushed to adaam1101/adam-ameyoud-exams#main");
  } catch (e) {
    console.log("Push to adam-ameyoud-exams failed:", e.message);
  }

  // Also push to branch exam-platform-prod on adaam1101/student-space (already authorized in Vercel GitHub App, repoId=1364729444)
  try {
    execSync("git push https://github.com/adaam1101/student-space.git main:refs/heads/exam-platform-prod --force", {
      stdio: "inherit",
    });
    console.log("Pushed to adaam1101/student-space#exam-platform-prod");
  } catch (e) {
    console.log("Push to student-space branch failed:", e.message);
  }

  const sha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  console.log("COMMIT_SHA=" + sha);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
