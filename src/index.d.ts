import { BuilderContext, BuilderOutput } from "@angular-devkit/architect";
interface IOptions {
    locales?: string[];
    source?: string;
    destination?: string;
    sourceFile?: string;
    indent?: number | string;
}
declare const _default: import("@angular-devkit/architect/src/internal").Builder<IOptions & import("@angular-devkit/core").JsonObject>;
export default _default;
export declare function mergeJsonTranslationsBuilder(options: IOptions, context: BuilderContext): Promise<BuilderOutput>;
