import { promises as fs } from "fs";
import path from "path";

async function main() {
	const targetVersion = process.env.npm_package_version;
	if (!targetVersion) {
		console.error(
			"Error: La variable de entorno npm_package_version no está definida."
		);
		process.exit(1);
	}

	try {
		console.log(`Actualizando la versión a: ${targetVersion}`);

		// Leer y actualizar manifest.json
		const manifestPath = path.resolve("manifest.json");
		const manifestData = await fs.readFile(manifestPath, "utf8");
		const manifest = JSON.parse(manifestData);
		const { minAppVersion } = manifest;
		manifest.version = targetVersion;
		await fs.writeFile(manifestPath, JSON.stringify(manifest, null, "\t"));
		console.log("manifest.json actualizado.");

		// Leer y actualizar versions.json
		const versionsPath = path.resolve("versions.json");
		const versionsData = await fs.readFile(versionsPath, "utf8");
		const versions = JSON.parse(versionsData);
		versions[targetVersion] = minAppVersion;
		await fs.writeFile(versionsPath, JSON.stringify(versions, null, "\t"));
		console.log("versions.json actualizado.");
	} catch (error) {
		console.error("Error durante el versionado:", error);
		process.exit(1);
	}
}

main();
