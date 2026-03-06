#!/usr/bin/env node
import { createCLI } from "./cli/index.js";
import { parseCallbackUrl, forwardCallback } from "./utils/url-scheme.js";

// Check if invoked as URL handler
const urlCallbackIndex = process.argv.indexOf("--url-callback");
if (urlCallbackIndex !== -1 && process.argv[urlCallbackIndex + 1]) {
  const callbackUrl = process.argv[urlCallbackIndex + 1];
  const code = parseCallbackUrl(callbackUrl);

  if (code) {
    forwardCallback(code)
      .then((success) => {
        process.exit(success ? 0 : 1);
      })
      .catch(() => {
        process.exit(1);
      });
  } else {
    console.error("Failed to parse callback URL");
    process.exit(1);
  }
} else {
  // Normal CLI operation
  const program = createCLI();
  program.parse(process.argv);
}
