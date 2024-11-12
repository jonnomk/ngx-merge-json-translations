import { BuilderContext, BuilderOutput, createBuilder } from "@angular-devkit/architect";
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import * as path from "path";

interface IOptions {
	locales?: string[];
	source?: string;
	destination?: string;
	sourceFile?: string;
	indent?: number | string;
}

interface IJSONData {
	[key: string]: any;
}

interface IComparisonResult {
	addedKeys: string[];
	removedKeys: string[];
}

const DEFAULT_CONFIG = {
	source: 'src/i18n',
	sourceFile: 'messages.json',
	destination: 'src/i18n',
	locales: <string[]>[]
};

export default createBuilder(mergeJsonTranslationsBuilder);

export async function mergeJsonTranslationsBuilder (
	options: IOptions,
	context: BuilderContext,
): Promise<BuilderOutput> {

	const {
		source = DEFAULT_CONFIG.source,
		sourceFile = DEFAULT_CONFIG.sourceFile,
		destination = DEFAULT_CONFIG.destination,
		locales = DEFAULT_CONFIG.locales,
	} = options;

	const fileStem = sourceFile.split('.')[0];
	const sourceFilePath = path.join(source, `${ fileStem }.json`);

	const validation = validatePaths(source, destination, sourceFilePath, context);
	if (!validation.isValid) {
		return { success: false };
	}

	if (!existsSync(destination)) {
		mkdirSync(destination, { recursive: true });
	}

	if (!locales.length) {
		context.logger.error('No locales specified');
		return { success: false };
	}

	const sourceData = readJSONFile(sourceFilePath, context);
	if (!sourceData) {
		context.logger.error(`Failed to read JSON from ${ sourceFilePath }`);
		return { success: false };
	}

	const { locale, translations } = sourceData;

	if (locale === undefined) {
		context.logger.error(`No locale found in ${ sourceFilePath }`);
		return { success: false };
	}

	if (translations === undefined) {
		context.logger.error(`No translations found in ${ sourceFilePath }`);
		return { success: false };
	}

	try {
		await Promise.all(locales.map(locale => {
			const destinationFilePath = path.join(destination, `${ fileStem }.${ locale }.json`);
			return mergeJson(sourceFilePath, sourceData, destinationFilePath, options, context);
		}));
	} catch (err) {
		context.logger.error('Failed to convert files.');
		return {
			success: false,
			error: (<Error>err).message,
		};
	}

	context.logger.info('🎉 Done!');
	return { success: true };
}

function validatePaths (
	source: string,
	destination: string,
	sourceFilePath: string,
	context: BuilderContext
): {
	isValid: boolean
} {
	if (!existsSync(source) || !lstatSync(source).isDirectory()) {
		context.logger.error(`Source ${ source } doesn't exist or isn't a folder`);
		return { isValid: false };
	}

	if (!existsSync(sourceFilePath)) {
		context.logger.error(`Source file ${ sourceFilePath } doesn't exist`);
		return { isValid: false };
	}

	if (existsSync(destination) && !lstatSync(destination).isDirectory()) {
		context.logger.error(`Destination ${ destination } isn't a folder`);
		return { isValid: false };
	}

	return { isValid: true };
}

function mergeJson (
	sourceFilePath: string,
	sourceData: IJSONData,
	destinationFilePath: string,
	options: IOptions,
	context: BuilderContext
): void {

	if (!existsSync(destinationFilePath)) {
		context.logger.info(`🔎 New locale found - creating a new file ${ destinationFilePath }`);
		const locale = destinationFilePath.split('.').slice(-2)[0];
		const json = sourceData;
		json['locale'] = locale;
		writeJsonToFile(destinationFilePath, json, options.indent);
		return;
	}

	const comparisonResult = compareKeys(sourceData, destinationFilePath, context);

	if (comparisonResult) {
		mergeAddedTranslations(comparisonResult.addedKeys, destinationFilePath, sourceFilePath, sourceData, options, context);
		deleteRemovedTranslations(comparisonResult.removedKeys, destinationFilePath, options, context);
	} else {
		context.logger.error('Couldn\'t compare the files, please check the paths or file contents.');
	}
}

function writeJsonToFile (destinationFilePath: string, json: IJSONData, indent: number | string = '\t'): void {
	writeFileSync(destinationFilePath, JSON.stringify(json, null, indent), 'utf-8');
}

function readJSONFile (filePath: string, context: BuilderContext): IJSONData | null {
	try {
		const rawData = readFileSync(filePath, 'utf-8');
		return JSON.parse(rawData) as IJSONData;
	} catch (error) {
		context.logger.error(`Error reading file ${ filePath }:`, error);
		return null;
	}
}

function compareKeys (sourceData: IJSONData, destFile: string, context: BuilderContext): IComparisonResult | null {
	const destData = readJSONFile(destFile, context);

	if (!sourceData?.translations || !destData?.translations) {
		return null;
	}

	const sourceKeys = new Set(Object.keys(sourceData.translations));
	const destKeys = new Set(Object.keys(destData.translations));

	const addedKeys: string[] = [];
	const removedKeys: string[] = [];

	for (const key of sourceKeys) {
		if (!destKeys.has(key)) {
			addedKeys.push(key);
		}
	}

	for (const key of destKeys) {
		if (!sourceKeys.has(key)) {
			removedKeys.push(key);
		}
	}

	return { addedKeys, removedKeys };
}

function mergeAddedTranslations (
	addedKeys: string[],
	destinationFilePath: string,
	sourceFilePath: string,
	sourceData: IJSONData,
	options: IOptions,
	context: BuilderContext
): void {
	if (!addedKeys.length) {
		context.logger.info(`☕ No keys to add to ${ destinationFilePath }`);
		return;
	}

	const destData = readJSONFile(destinationFilePath, context);

	if (destData && sourceData) {
		const orderedTranslations: { [key: string]: any; } = { ...destData.translations };
		const sourceKeys = Object.keys(sourceData.translations);

		const newTranslations: { [key: string]: any; } = {};

		for (const key of sourceKeys) {
			if (addedKeys.includes(key)) {
				orderedTranslations[key] = sourceData.translations[key];
			}
			newTranslations[key] = orderedTranslations[key] ?? destData.translations[key];
		}

		destData.translations = newTranslations;

		writeJsonToFile(destinationFilePath, destData, options.indent);
		context.logger.info(`➡️ Added ${ addedKeys.length } key(s) to ${ destinationFilePath }`);
	} else {
		context.logger.error(`Failed to read JSON from ${ sourceFilePath } or ${ destinationFilePath }`);
	}
}

function deleteRemovedTranslations (
	removedKeys: string[],
	destinationFilePath: string,
	options: IOptions,
	context: BuilderContext
): void {
	if (!removedKeys.length) {
		context.logger.info(`☕ No keys to remove from ${ destinationFilePath }`);
		return;
	}

	const destData = readJSONFile(destinationFilePath, context);

	if (destData) {
		for (const key of removedKeys) {
			delete destData.translations[key];
		}
		writeJsonToFile(destinationFilePath, destData, options.indent);
		context.logger.info(`🗑️ Removed ${ removedKeys.length } key(s) from ${ destinationFilePath }`);
	} else {
		context.logger.error(`Failed to read JSON from ${ destinationFilePath }`);
	}
}
