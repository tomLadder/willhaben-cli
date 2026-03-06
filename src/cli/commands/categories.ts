import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import {
  getCategoryTree,
  findCategoryByPath,
  getAllAttributesForPath,
  searchCategories,
  type CategoryTreeResponse,
  type CategoryNode,
  type AttributeReference,
} from "../../api/categories.js";

let cachedTree: CategoryTreeResponse | null = null;

async function loadCategoryTree(): Promise<CategoryTreeResponse | null> {
  if (cachedTree) return cachedTree;

  const spinner = ora("Loading category tree...").start();
  const result = await getCategoryTree(67);

  if (result.success && result.data) {
    spinner.stop();
    cachedTree = result.data;
    return cachedTree;
  }

  spinner.fail(chalk.red("Failed to load category tree"));
  if (result.error) {
    console.error(chalk.dim(result.error.message));
  }
  return null;
}

function formatAttribute(attr: AttributeReference): void {
  const required = attr.required ? chalk.red("*") : "";
  const type = chalk.dim(`[${attr.selectionType}]`);
  console.log(`  ${chalk.cyan(attr.code)}${required} ${type}`);
}

function formatCategoryNode(node: CategoryNode, indent = 0): void {
  const prefix = "  ".repeat(indent);
  console.log(`${prefix}${chalk.bold(node.code)} - ${node.label}`);
}

export function registerCategoryCommands(program: Command): void {
  const categories = program
    .command("categories")
    .description("Browse and search willhaben categories");

  categories
    .command("list [path...]")
    .description("List categories at a given path (or top-level if no path)")
    .option("--json", "Output as JSON")
    .action(async (pathParts: string[], opts) => {
      const tree = await loadCategoryTree();
      if (!tree) return;

      let node: CategoryNode | null = tree.categoryNode;

      if (pathParts && pathParts.length > 0) {
        node = findCategoryByPath(tree.categoryNode, pathParts);
        if (!node) {
          console.error(chalk.red(`Category path not found: ${pathParts.join(" > ")}`));
          process.exit(1);
        }
      }

      if (opts.json) {
        console.log(JSON.stringify(node, null, 2));
        return;
      }

      if (pathParts && pathParts.length > 0) {
        console.log(chalk.bold(`\nCategory: ${node.label}`));
        console.log(chalk.dim(`Path: ${pathParts.join(" > ")}\n`));
      } else {
        console.log(chalk.bold("\nTop-level categories:\n"));
      }

      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          const hasChildren = child.children && child.children.length > 0;
          const suffix = hasChildren ? chalk.dim(` (${child.children.length} subcategories)`) : "";
          console.log(`  ${chalk.cyan(child.code)} - ${child.label}${suffix}`);
        }
        console.log();
      } else {
        console.log(chalk.yellow("  No subcategories (this is a leaf category)\n"));
      }
    });

  categories
    .command("search <query>")
    .description("Search categories by name")
    .option("-l, --limit <number>", "Limit results", "20")
    .option("--json", "Output as JSON")
    .action(async (query: string, opts) => {
      const tree = await loadCategoryTree();
      if (!tree) return;

      const results = searchCategories(tree.categoryNode, query);
      const limit = parseInt(opts.limit);
      const limited = results.slice(0, limit);

      if (opts.json) {
        console.log(JSON.stringify(limited, null, 2));
        return;
      }

      if (results.length === 0) {
        console.log(chalk.yellow(`No categories found matching "${query}"`));
        return;
      }

      console.log(chalk.bold(`\nFound ${results.length} categories matching "${query}":\n`));

      for (const { path, labels } of limited) {
        console.log(`  ${chalk.cyan(path.join(" > "))}`);
        console.log(chalk.dim(`    ${labels.join(" > ")}`));
      }

      if (results.length > limit) {
        console.log(chalk.dim(`\n  ... and ${results.length - limit} more (use --limit to show more)`));
      }
      console.log();
    });

  categories
    .command("info <path...>")
    .description("Show category details and required attributes")
    .option("--json", "Output as JSON")
    .action(async (pathParts: string[], opts) => {
      const tree = await loadCategoryTree();
      if (!tree) return;

      const node = findCategoryByPath(tree.categoryNode, pathParts);
      if (!node) {
        console.error(chalk.red(`Category path not found: ${pathParts.join(" > ")}`));
        process.exit(1);
      }

      const attributes = getAllAttributesForPath(tree.categoryNode, pathParts);

      if (opts.json) {
        console.log(JSON.stringify({ category: node, attributes }, null, 2));
        return;
      }

      console.log(chalk.bold(`\nCategory: ${node.label}`));
      console.log(chalk.dim(`Code: ${node.code}`));
      console.log(chalk.dim(`Tree ID: ${node.treeId}`));
      console.log(chalk.dim(`Path: ${pathParts.join(" > ")}\n`));

      const requiredAttrs = attributes.filter((a) => a.required);
      const optionalAttrs = attributes.filter((a) => !a.required);

      if (requiredAttrs.length > 0) {
        console.log(chalk.bold("Required attributes:"));
        for (const attr of requiredAttrs) {
          formatAttribute(attr);
        }
        console.log();
      }

      if (optionalAttrs.length > 0) {
        console.log(chalk.bold("Optional attributes:"));
        for (const attr of optionalAttrs) {
          formatAttribute(attr);
        }
        console.log();
      }

      if (attributes.length === 0) {
        console.log(chalk.dim("No specific attributes for this category.\n"));
      }

      if (node.systemTags && node.systemTags.length > 0) {
        console.log(chalk.bold("System tags:"));
        console.log(chalk.dim(`  ${node.systemTags.join(", ")}`));
        console.log();
      }

      // Show template example
      console.log(chalk.bold("Template example:"));
      console.log(chalk.dim(JSON.stringify({
        categoryPath: pathParts,
      }, null, 2)));
      console.log();
    });

  categories
    .command("tree [path...]")
    .description("Show category tree structure")
    .option("-d, --depth <number>", "Maximum depth to display", "2")
    .action(async (pathParts: string[], opts) => {
      const tree = await loadCategoryTree();
      if (!tree) return;

      let startNode: CategoryNode | null = tree.categoryNode;
      const maxDepth = parseInt(opts.depth);

      if (pathParts && pathParts.length > 0) {
        startNode = findCategoryByPath(tree.categoryNode, pathParts);
        if (!startNode) {
          console.error(chalk.red(`Category path not found: ${pathParts.join(" > ")}`));
          process.exit(1);
        }
        console.log(chalk.bold(`\nCategory tree from: ${pathParts.join(" > ")}\n`));
      } else {
        console.log(chalk.bold("\nCategory tree:\n"));
      }

      function printTree(node: CategoryNode, depth: number, prefix: string) {
        if (depth > maxDepth) return;

        const hasChildren = node.children && node.children.length > 0;
        const attrCount = node.attributeReferences?.length || 0;
        const attrSuffix = attrCount > 0 ? chalk.yellow(` [${attrCount} attrs]`) : "";

        console.log(`${prefix}${chalk.cyan(node.code)} - ${node.label}${attrSuffix}`);

        if (hasChildren && depth < maxDepth) {
          for (let i = 0; i < node.children.length; i++) {
            const isLast = i === node.children.length - 1;
            const newPrefix = prefix + (isLast ? "  " : "| ");
            printTree(node.children[i], depth + 1, newPrefix);
          }
        }
      }

      if (startNode.children) {
        for (const child of startNode.children) {
          printTree(child, 1, "");
        }
      }
      console.log();
    });
}
