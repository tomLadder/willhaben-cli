import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { readFile } from "fs/promises";
import prompts from "prompts";
import {
  listMyListings,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  republishListing,
  deactivateListing,
  markListingSold,
  markListingReserved,
  unreserveListing,
  uploadImage,
  uploadImages,
  getImages,
  deleteImage,
  deleteAllImages,
  type PublishListingOptions,
} from "../../api/listings.js";
import { isAuthenticated, getConfigValue, getJwtUserInfo } from "../../store/config.js";
import { getCachedListing } from "../../store/listings.js";
import type { ListingTemplate, Listing } from "../../types/index.js";

async function requireAuth(): Promise<void> {
  if (!(await isAuthenticated())) {
    console.log(chalk.red("You must be logged in to use this command."));
    console.log(chalk.dim("Run `willhaben login` to login."));
    process.exit(1);
  }
}

function formatListing(listing: Listing, verbose = false): void {
  console.log(`${chalk.bold(listing.title)}`);
  console.log(`  ID: ${chalk.dim(listing.id)}`);
  console.log(`  Price: ${chalk.green(`${listing.price} ${listing.currency}`)}`);
  console.log(`  Status: ${formatStatus(listing.status)}`);
  console.log(`  Category: ${listing.category}`);

  if (verbose) {
    console.log(`  Description: ${listing.description.slice(0, 100)}...`);
    if (listing.location?.city) {
      console.log(`  Location: ${listing.location.city}`);
    }
    console.log(`  Created: ${new Date(listing.createdAt).toLocaleDateString()}`);
    if (listing.expiresAt) {
      console.log(`  Expires: ${new Date(listing.expiresAt).toLocaleDateString()}`);
    }
    console.log(`  Images: ${listing.images.length}`);
  }
}

function formatStatus(status: Listing["status"]): string {
  switch (status) {
    case "active":
      return chalk.green(status);
    case "inactive":
      return chalk.yellow(status);
    case "expired":
      return chalk.red(status);
    case "deleted":
      return chalk.dim(status);
    default:
      return status;
  }
}

async function outputResult<T>(data: T): Promise<void> {
  const format = await getConfigValue("outputFormat");
  if (format === "json") {
    console.log(JSON.stringify(data, null, 2));
  }
}

export function registerListingCommands(program: Command): void {
  program
    .command("list")
    .description("List all your listings")
    .option("-p, --page <number>", "Page number", "1")
    .option("-s, --size <number>", "Page size", "20")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      await requireAuth();

      const spinner = ora("Fetching listings...").start();

      const result = await listMyListings(
        parseInt(opts.page),
        parseInt(opts.size)
      );

      if (result.success && result.data) {
        spinner.stop();

        if (opts.json) {
          console.log(JSON.stringify(result.data, null, 2));
          return;
        }

        if (result.data.listings.length === 0) {
          console.log(chalk.yellow("No listings found."));
          return;
        }

        console.log(
          chalk.bold(`Your listings (${result.data.total} total):\n`)
        );
        for (const listing of result.data.listings) {
          formatListing(listing);
          console.log();
        }

        await outputResult(result.data);
      } else {
        spinner.fail(chalk.red("Failed to fetch listings"));
        console.error(
          chalk.red(result.error?.message || "Unknown error occurred")
        );
      }
    });

  program
    .command("get <id>")
    .description("Get details of a specific listing")
    .option("--json", "Output as JSON")
    .option("--cached", "Use cached data if available")
    .action(async (id: string, opts) => {
      await requireAuth();

      // Try cache first if requested
      if (opts.cached) {
        const cached = await getCachedListing(id);
        if (cached) {
          if (opts.json) {
            console.log(JSON.stringify(cached, null, 2));
          } else {
            formatListing(cached, true);
          }
          return;
        }
      }

      const spinner = ora("Fetching listing...").start();

      const result = await getListing(id);

      if (result.success && result.data) {
        spinner.stop();

        if (opts.json) {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          formatListing(result.data, true);
        }
      } else {
        spinner.fail(chalk.red("Failed to fetch listing"));
        console.error(
          chalk.red(result.error?.message || "Unknown error occurred")
        );
      }
    });

  program
    .command("publish <file>")
    .description("Publish a new listing from a JSON template file")
    .option("--json", "Output as JSON")
    .option("--draft", "Save as draft without publishing")
    .action(async (file: string, opts) => {
      await requireAuth();

      // Get user info from JWT
      const userInfo = await getJwtUserInfo();
      if (!userInfo) {
        console.error(chalk.red("Failed to get user info from token. Try logging in again."));
        process.exit(1);
      }

      // Read and parse template file
      let template: ListingTemplate;
      try {
        const content = await readFile(file, "utf-8");
        template = JSON.parse(content);
      } catch (err) {
        console.error(chalk.red(`Failed to read template file: ${file}`));
        if (err instanceof Error) {
          console.error(chalk.dim(err.message));
        }
        process.exit(1);
      }

      // Validate required fields
      const requiredFields = ["title", "description", "price", "categoryPath", "postCode", "locationId", "location"];
      const missing = requiredFields.filter((f) => !(f in template) || template[f as keyof ListingTemplate] === undefined);
      if (missing.length > 0) {
        console.error(chalk.red(`Template missing required fields: ${missing.join(", ")}`));
        console.error(chalk.dim("\nExample template:"));
        console.error(chalk.dim(JSON.stringify({
          title: "My Item",
          description: "Item description",
          price: 10,
          postCode: "8010",
          locationId: 117458,
          location: "Graz",
          categoryPath: ["BOOKSFILMANDMUSIC", "NON_FICTION_BOOKS"],
          condition: "gebraucht",
          delivery: ["PICKUP", "Versand"]
        }, null, 2)));
        process.exit(1);
      }

      const spinner = ora("Publishing listing...").start();

      const publishOptions: PublishListingOptions = {
        title: template.title,
        description: template.description,
        price: template.price,
        postCode: template.postCode,
        locationId: template.locationId,
        location: template.location,
        street: template.street,
        categoryPath: template.categoryPath,
        condition: template.condition,
        delivery: template.delivery,
        firstName: template.contactInfo?.name,
        attributes: template.attributes,
        skipValidation: template.skipValidation,
      };

      const result = await createListing(publishOptions, userInfo);

      if (result.success && result.data) {
        spinner.succeed(chalk.green("Listing published successfully!"));

        if (opts.json) {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          console.log(`  ID: ${chalk.cyan(result.data.id)}`);
          console.log(`  Title: ${result.data.title}`);
          console.log(`  Price: ${chalk.green(`€ ${result.data.price}`)}`);
        }
      } else {
        spinner.fail(chalk.red("Failed to publish listing"));
        console.error(
          chalk.red(result.error?.message || "Unknown error occurred")
        );
        process.exit(1);
      }
    });

  program
    .command("update <id>")
    .description("Update an existing listing")
    .option("--title <title>", "New title")
    .option("--description <description>", "New description")
    .option("--price <price>", "New price")
    .option("--json", "Output as JSON")
    .action(async (id: string, opts) => {
      await requireAuth();

      const updates: Record<string, unknown> = {};
      if (opts.title) updates.title = opts.title;
      if (opts.description) updates.description = opts.description;
      if (opts.price) updates.price = parseFloat(opts.price);

      if (Object.keys(updates).length === 0) {
        console.error(
          chalk.red("No updates provided. Use --title, --description, or --price")
        );
        process.exit(1);
      }

      const spinner = ora("Updating listing...").start();

      const result = await updateListing(id, updates);

      if (result.success && result.data) {
        spinner.succeed(chalk.green("Listing updated successfully!"));

        if (opts.json) {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          formatListing(result.data);
        }
      } else {
        spinner.fail(chalk.red("Failed to update listing"));
        console.error(
          chalk.red(result.error?.message || "Unknown error occurred")
        );
        process.exit(1);
      }
    });

  program
    .command("delete <id>")
    .description("Delete a listing")
    .option("-f, --force", "Skip confirmation")
    .action(async (id: string, opts) => {
      await requireAuth();

      if (!opts.force) {
        const { confirm } = await prompts({
          type: "confirm",
          name: "confirm",
          message: `Are you sure you want to delete listing ${id}?`,
          initial: false,
        });
        if (!confirm) {
          console.log(chalk.yellow("Cancelled."));
          return;
        }
      }

      const spinner = ora("Deleting listing...").start();

      const result = await deleteListing(id);

      if (result.success) {
        spinner.succeed(chalk.green("Listing deleted successfully!"));
      } else {
        spinner.fail(chalk.red("Failed to delete listing"));
        console.error(
          chalk.red(result.error?.message || "Unknown error occurred")
        );
        process.exit(1);
      }
    });

  program
    .command("republish <id>")
    .description("Republish an expired listing")
    .option("--json", "Output as JSON")
    .action(async (id: string, opts) => {
      await requireAuth();

      const spinner = ora("Republishing listing...").start();

      const result = await republishListing(id);

      if (result.success && result.data) {
        spinner.succeed(chalk.green("Listing republished successfully!"));

        if (opts.json) {
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          formatListing(result.data);
        }
      } else {
        spinner.fail(chalk.red("Failed to republish listing"));
        console.error(
          chalk.red(result.error?.message || "Unknown error occurred")
        );
        process.exit(1);
      }
    });

  program
    .command("deactivate <id>")
    .description("Deactivate a listing (take offline)")
    .action(async (id: string) => {
      await requireAuth();

      const spinner = ora("Deactivating listing...").start();

      const result = await deactivateListing(id);

      if (result.success) {
        spinner.succeed(chalk.green("Listing deactivated successfully!"));
      } else {
        spinner.fail(chalk.red("Failed to deactivate listing"));
        console.error(
          chalk.red(result.error?.message || "Unknown error occurred")
        );
        process.exit(1);
      }
    });

  program
    .command("reserve <id>")
    .description("Mark a listing as reserved")
    .action(async (id: string) => {
      await requireAuth();

      const spinner = ora("Marking as reserved...").start();

      const result = await markListingReserved(id);

      if (result.success) {
        spinner.succeed(chalk.green("Listing marked as reserved!"));
      } else {
        spinner.fail(chalk.red("Failed to mark listing as reserved"));
        console.error(
          chalk.red(result.error?.message || "Unknown error occurred")
        );
        process.exit(1);
      }
    });

  program
    .command("unreserve <id>")
    .description("Remove reserved status from a listing")
    .action(async (id: string) => {
      await requireAuth();

      const spinner = ora("Removing reservation...").start();

      const result = await unreserveListing(id);

      if (result.success) {
        spinner.succeed(chalk.green("Reservation removed!"));
      } else {
        spinner.fail(chalk.red("Failed to remove reservation"));
        console.error(
          chalk.red(result.error?.message || "Unknown error occurred")
        );
        process.exit(1);
      }
    });

  program
    .command("sold <id>")
    .description("Mark a listing as sold")
    .action(async (id: string) => {
      await requireAuth();

      const spinner = ora("Marking as sold...").start();

      const result = await markListingSold(id);

      if (result.success) {
        spinner.succeed(chalk.green("Listing marked as sold!"));
      } else {
        spinner.fail(chalk.red("Failed to mark listing as sold"));
        console.error(
          chalk.red(result.error?.message || "Unknown error occurred")
        );
        process.exit(1);
      }
    });

  // Image commands
  program
    .command("images <id>")
    .description("List images for a listing")
    .option("--json", "Output as JSON")
    .action(async (id: string, opts) => {
      await requireAuth();

      const spinner = ora("Fetching images...").start();

      const result = await getImages(id);

      if (result.success && result.data) {
        spinner.stop();

        if (opts.json) {
          console.log(JSON.stringify(result.data, null, 2));
          return;
        }

        if (result.data.advertImage.length === 0) {
          console.log(chalk.yellow("No images found for this listing."));
          return;
        }

        console.log(chalk.bold(`\nImages for listing ${id}:\n`));
        for (const img of result.data.advertImage) {
          console.log(`  ${chalk.cyan(`#${img.id}`)} - ${img.referenceImageUrl}`);
        }
        console.log();
      } else {
        spinner.fail(chalk.red("Failed to fetch images"));
        console.error(chalk.red(result.error?.message || "Unknown error"));
        process.exit(1);
      }
    });

  program
    .command("upload-image <id> <image...>")
    .description("Upload one or more images to a listing")
    .action(async (id: string, imagePaths: string[]) => {
      await requireAuth();

      const spinner = ora(`Uploading ${imagePaths.length} image(s)...`).start();

      const result = await uploadImages(id, imagePaths);

      if (result.success && result.data) {
        spinner.succeed(chalk.green(`Successfully uploaded ${result.data.advertImage.length} image(s)!`));
        for (const img of result.data.advertImage) {
          console.log(`  ${chalk.cyan(`#${img.id}`)} - ${img.thumbnailImageUrl}`);
        }
      } else {
        spinner.fail(chalk.red("Failed to upload image(s)"));
        console.error(chalk.red(result.error?.message || "Unknown error"));
        process.exit(1);
      }
    });

  program
    .command("delete-image <id> <imageId>")
    .description("Delete an image from a listing")
    .action(async (id: string, imageId: string) => {
      await requireAuth();

      const spinner = ora("Deleting image...").start();

      const result = await deleteImage(id, parseInt(imageId));

      if (result.success) {
        spinner.succeed(chalk.green("Image deleted!"));
      } else {
        spinner.fail(chalk.red("Failed to delete image"));
        console.error(chalk.red(result.error?.message || "Unknown error"));
        process.exit(1);
      }
    });

  program
    .command("clear-images <id>")
    .description("Delete all images from a listing")
    .action(async (id: string) => {
      await requireAuth();

      const spinner = ora("Deleting all images...").start();

      const result = await deleteAllImages(id);

      if (result.success) {
        spinner.succeed(chalk.green("All images deleted!"));
      } else {
        spinner.fail(chalk.red("Failed to delete images"));
        console.error(chalk.red(result.error?.message || "Unknown error"));
        process.exit(1);
      }
    });
}
