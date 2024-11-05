"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeJsonTranslationsBuilder = mergeJsonTranslationsBuilder;
const architect_1 = require("@angular-devkit/architect");
const fs_1 = require("fs");
const path = require("path");
const DEFAULT_CONFIG = {
    source: 'src/i18n',
    sourceFile: 'messages.json',
    destination: 'src/i18n',
    locales: []
};
function validatePaths(source, destination, sourceFilePath, context) {
    if (!(0, fs_1.existsSync)(source) || !(0, fs_1.lstatSync)(source).isDirectory()) {
        context.logger.error(`Source ${source} doesn't exist or isn't a folder`);
        return { isValid: false };
    }
    if (!(0, fs_1.existsSync)(sourceFilePath)) {
        context.logger.error(`Source file ${sourceFilePath} doesn't exist`);
        return { isValid: false };
    }
    if ((0, fs_1.existsSync)(destination) && !(0, fs_1.lstatSync)(destination).isDirectory()) {
        context.logger.error(`Destination ${destination} isn't a folder`);
        return { isValid: false };
    }
    return { isValid: true };
}
exports.default = (0, architect_1.createBuilder)(mergeJsonTranslationsBuilder);
function mergeJsonTranslationsBuilder(options, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const { source = DEFAULT_CONFIG.source, sourceFile = DEFAULT_CONFIG.sourceFile, destination = DEFAULT_CONFIG.destination, locales = DEFAULT_CONFIG.locales, } = options;
        const fileStem = sourceFile.split('.')[0];
        const sourceFilePath = path.join(source, `${fileStem}.json`);
        const validation = validatePaths(source, destination, sourceFilePath, context);
        if (!validation.isValid) {
            return { success: false };
        }
        if (!(0, fs_1.existsSync)(destination)) {
            (0, fs_1.mkdirSync)(destination, { recursive: true });
        }
        if (!locales.length) {
            context.logger.error('No locales specified');
            return { success: false };
        }
        const sourceData = readJSONFile(sourceFilePath);
        if (!sourceData) {
            context.logger.error(`Failed to read JSON from ${sourceFilePath}`);
            return { success: false };
        }
        const { locale, translations } = sourceData;
        if (locale === undefined) {
            context.logger.error(`No locale found in ${sourceFilePath}`);
            return { success: false };
        }
        if (translations === undefined) {
            context.logger.error(`No translations found in ${sourceFilePath}`);
            return { success: false };
        }
        try {
            yield Promise.all(locales.map(locale => {
                const destinationFilePath = path.join(destination, `${fileStem}.${locale}.json`);
                return mergeJson(sourceFilePath, sourceData, destinationFilePath, options, context);
            }));
        }
        catch (err) {
            context.logger.error('Failed to convert files.');
            return {
                success: false,
                error: err.message,
            };
        }
        context.reportStatus('🎉 Done!');
        return { success: true };
    });
}
function mergeJson(sourceFilePath, sourceData, destinationFilePath, options, context) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(0, fs_1.existsSync)(destinationFilePath)) {
            context.logger.info(`🔎 New locale found - creating a new file ${destinationFilePath}`);
            const locale = destinationFilePath.split('.').slice(-2)[0];
            const json = sourceData;
            json['locale'] = locale;
            writeJsonToFile(destinationFilePath, json, options.indent);
            return;
        }
        const comparisonResult = compareKeys(sourceData, destinationFilePath);
        if (comparisonResult) {
            mergeAddedTranslations(comparisonResult.addedKeys, destinationFilePath, sourceFilePath, sourceData, options, context);
            deleteRemovedTranslations(comparisonResult.removedKeys, destinationFilePath, options, context);
        }
        else {
            context.logger.error('Couldn\'t compare the files, please check the paths or file contents.');
        }
    });
}
function writeJsonToFile(destinationFilePath, json, indent = '\t') {
    (0, fs_1.writeFileSync)(destinationFilePath, JSON.stringify(json, null, indent), 'utf-8');
}
function readJSONFile(filePath) {
    try {
        const rawData = (0, fs_1.readFileSync)(filePath, 'utf-8');
        return JSON.parse(rawData);
    }
    catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        return null;
    }
}
function compareKeys(sourceData, destFile) {
    const destData = readJSONFile(destFile);
    if (!(sourceData === null || sourceData === void 0 ? void 0 : sourceData.translations) ||
        !(destData === null || destData === void 0 ? void 0 : destData.translations)) {
        return null;
    }
    ;
    const sourceKeys = new Set(Object.keys(sourceData.translations));
    const destKeys = new Set(Object.keys(destData.translations));
    const addedKeys = [];
    const removedKeys = [];
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
function mergeAddedTranslations(addedKeys, destinationFilePath, sourceFilePath, sourceData, options, context) {
    var _a;
    if (!addedKeys.length) {
        context.logger.info(`☕ No keys to add to ${destinationFilePath}`);
        return;
    }
    const destData = readJSONFile(destinationFilePath);
    if (destData && sourceData) {
        const orderedTranslations = Object.assign({}, destData.translations);
        const sourceKeys = Object.keys(sourceData.translations);
        const newTranslations = {};
        for (const key of sourceKeys) {
            if (addedKeys.includes(key)) {
                orderedTranslations[key] = sourceData.translations[key];
            }
            newTranslations[key] = (_a = orderedTranslations[key]) !== null && _a !== void 0 ? _a : destData.translations[key];
        }
        destData.translations = newTranslations;
        writeJsonToFile(destinationFilePath, destData, options.indent);
        context.logger.info(`➡️ Added ${addedKeys.length} key(s) to ${destinationFilePath}`);
    }
    else {
        context.logger.error(`Failed to read JSON from ${sourceFilePath} or ${destinationFilePath}`);
    }
}
function deleteRemovedTranslations(removedKeys, destinationFilePath, options, context) {
    if (!removedKeys.length) {
        context.logger.info(`☕ No keys to remove from ${destinationFilePath}`);
        return;
    }
    const destData = readJSONFile(destinationFilePath);
    if (destData) {
        for (const key of removedKeys) {
            delete destData.translations[key];
        }
        writeJsonToFile(destinationFilePath, destData, options.indent);
        context.logger.info(`🗑️ Removed ${removedKeys.length} key(s) from ${destinationFilePath}`);
    }
    else {
        context.logger.error(`Failed to read JSON from ${destinationFilePath}`);
    }
}
//# sourceMappingURL=index.js.map