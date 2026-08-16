import { formatPlan, planLiveRun } from "./plan";
import { recordLiveRun } from "./record";

const command = process.argv[2] ?? "plan";

if (command === "plan") {
  process.stdout.write(`${formatPlan(planLiveRun())}\n`);
} else if (command === "record") {
  const result = await recordLiveRun();
  process.stdout.write(`Wrote secret-free bundle to ${result.dir}\n`);
  process.stdout.write(
    `Stopped: ${result.manifest.stoppedReason ?? "complete"}\n`,
  );
} else {
  process.stderr.write(`Unknown command ${command}. Use plan or record.\n`);
  process.exit(1);
}
