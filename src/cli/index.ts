import { Command } from "commander";
import { registerAuthCommands } from "./commands/auth.js";
import { registerListingCommands } from "./commands/listings.js";
import { registerConfigCommands } from "./commands/config.js";
import { registerSetupCommands } from "./commands/setup.js";
import { registerCategoryCommands } from "./commands/categories.js";
import { registerSearchCommands } from "./commands/search.js";
import { registerLocationCommands } from "./commands/locations.js";

export function createCLI(): Command {
  const program = new Command();

  program
    .name("willhaben")
    .description("CLI for managing willhaben.at listings")
    .version("1.0.0");

  // Register all commands
  registerAuthCommands(program);
  registerListingCommands(program);
  registerCategoryCommands(program);
  registerSearchCommands(program);
  registerLocationCommands(program);
  registerConfigCommands(program);
  registerSetupCommands(program);

  return program;
}
