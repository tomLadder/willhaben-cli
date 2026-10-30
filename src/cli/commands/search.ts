import { Command, InvalidArgumentError } from "commander";
import chalk from "chalk";
import ora from "ora";
import {
  searchAds,
  STATES,
  SORT_ORDERS,
  type SearchFacet,
  type SearchOptions,
  type SearchResultAd,
} from "../../api/search.js";

function parseNumber(value: string): number {
  const n = Number(value);
  if (Number.isNaN(n)) throw new InvalidArgumentError("Not a number.");
  return n;
}

function parseChoice(choices: Record<string, number>) {
  return (value: string): string => {
    const key = value.toLowerCase();
    if (!(key in choices)) {
      throw new InvalidArgumentError(`Allowed: ${Object.keys(choices).join(", ")}`);
    }
    return key;
  };
}

function collectFilter(value: string, previous: Array<[string, string]>): Array<[string, string]> {
  const index = value.indexOf("=");
  if (index <= 0) throw new InvalidArgumentError("Use the form param=value, e.g. treeAttributes=22");
  return [...previous, [value.slice(0, index), value.slice(index + 1)]];
}

function formatAd(ad: SearchResultAd): void {
  const price = ad.priceDisplay ?? (ad.price !== null ? `€ ${ad.price}` : "–");
  const badges = [ad.isPrivate ? null : chalk.yellow("dealer"), ad.paylivery ? chalk.cyan("paylivery") : null]
    .filter(Boolean)
    .join(" ");
  console.log(`${chalk.green(price.padEnd(10))} ${chalk.bold(ad.title)} ${badges}`);

  const published = ad.publishedAt ? new Date(ad.publishedAt).toLocaleDateString() : null;
  const meta = [ad.id, [ad.postCode, ad.location].filter(Boolean).join(" "), published]
    .filter(Boolean)
    .join(" · ");
  console.log(chalk.dim(`${" ".repeat(11)}${meta}`));
  if (ad.url) console.log(chalk.dim(`${" ".repeat(11)}${ad.url}`));
}

function formatFacets(facets: SearchFacet[]): void {
  for (const facet of facets) {
    if (facet.id === "keyword") continue;
    console.log(chalk.bold(`${facet.label} (${facet.id})`));
    for (const value of facet.values) {
      const params = value.params.map(([k, v]) => `${k}=${v}`).join("&");
      console.log(`  ${value.label} ${chalk.dim(`(${value.hits})`)}  ${chalk.cyan(`--filter ${params}`)}`);
    }
    console.log();
  }
}

export function registerSearchCommands(program: Command): void {
  program
    .command("search [keyword...]")
    .description("Search marketplace listings (no login required)")
    .option("-c, --category <id>", "Category id (see --facets)")
    .option("--min <price>", "Minimum price", parseNumber)
    .option("--max <price>", "Maximum price", parseNumber)
    .option("--state <state>", `State: ${Object.keys(STATES).join(", ")}`, parseChoice(STATES))
    .option("--private", "Only private sellers")
    .option("--dealer", "Only dealers")
    .option("--paylivery", "Only listings with PayLivery (buyer protection and shipping)")
    .option("--days <n>", "Only listings published in the last n days", parseNumber)
    .option("--sort <order>", `Sort: ${Object.keys(SORT_ORDERS).join(", ")}`, parseChoice(SORT_ORDERS))
    .option("-p, --page <number>", "Page number", parseNumber, 1)
    .option("-n, --rows <number>", "Results per page", parseNumber, 30)
    .option("-f, --filter <param=value>", "Raw search filter, repeatable (see --facets)", collectFilter, [])
    .option("--facets", "Show available filters with their hit counts")
    .option("--json", "Output as JSON")
    .action(async (keywordParts: string[], opts) => {
      if (opts.private && opts.dealer) {
        console.error(chalk.red("Use either --private or --dealer, not both."));
        process.exit(1);
      }

      const options: SearchOptions = {
        keyword: keywordParts.join(" ") || undefined,
        categoryId: opts.category,
        priceFrom: opts.min,
        priceTo: opts.max,
        state: opts.state,
        seller: opts.private ? "private" : opts.dealer ? "dealer" : undefined,
        paylivery: opts.paylivery,
        periodDays: opts.days,
        sort: opts.sort,
        page: opts.page,
        rows: opts.rows,
        params: opts.filter,
      };

      const spinner = ora("Searching...").start();
      const result = await searchAds(options);

      if (!result.success || !result.data) {
        spinner.fail(chalk.red("Search failed"));
        console.error(chalk.red(result.error?.message || "Unknown error occurred"));
        process.exit(1);
      }
      spinner.stop();

      const { data } = result;
      if (opts.json) {
        const { facets, ...rest } = data;
        console.log(JSON.stringify(opts.facets ? data : rest, null, 2));
        return;
      }

      if (opts.facets) {
        formatFacets(data.facets);
        return;
      }

      if (data.ads.length === 0) {
        console.log(chalk.yellow("No listings found."));
        return;
      }

      const pages = Math.ceil(data.total / data.rows);
      console.log(chalk.bold(`${data.total} listings found (page ${data.page} of ${pages}):\n`));
      for (const ad of data.ads) {
        formatAd(ad);
        console.log();
      }
      if (data.page < pages) {
        console.log(chalk.dim(`Next page: add --page ${data.page + 1}`));
      }
    });
}
