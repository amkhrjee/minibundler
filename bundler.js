import { parse } from "babylon";
import { readFileSync } from "fs";
import traverse from "babel-traverse";
import path from "path";
import { transformFromAst } from "@babel/core";

let ID = 0;

const createAsset = (filename) => {
    const content = readFileSync(filename, "utf-8");
    const ast = parse(content, {
        sourceType: "module",
    });

    const dependencies = [];

    // Have to use the "default" for transforming from CJS to ESM
    traverse.default(ast, {
        ImportDeclaration: ({ node }) => {
            dependencies.push(node.source.value);
        },
    });

    const { code } = transformFromAst(ast, null, {
        presets: ["@babel/preset-env"],
    });

    return {
        id: ID++,
        filename,
        dependencies,
        code,
    };
};

const createGraph = (entry) => {
    const mainAsset = createAsset(entry);

    const queue = [mainAsset];

    for (const asset of queue) {
        const dirname = path.dirname(asset.filename);

        asset.mapping = {};

        asset.dependencies.forEach((relativePath) => {
            const absolutePath = path.join(dirname, relativePath) + ".js";

            const child = createAsset(absolutePath);

            asset.mapping[relativePath] = child.id;

            queue.push(child);
        });
    }

    return queue;
};

const bundle = (graph) => {
    let modules = "";

    graph.forEach((mod) => {
        modules += `${mod.id}: [
            function(require, module, exports) {
                ${mod.code}
            },
            ${JSON.stringify(mod.mapping)}
        ],`;
    });

    const result = `
    (function(mapping){
        function require(id) {
            const [fn, mapping] = mapping[id];
        }
    })({${modules}})
    `;

    return result;
};

const graph = createGraph("./example/entry.js");
const result = bundle(graph);
console.log(result);
