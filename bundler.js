import { parse } from "babylon";
import { readFileSync } from "fs";
import traverse from "babel-traverse";

const createAsset = (filename) => {
    const content = readFileSync(filename, "utf-8");
    const ast = parse(content, {
        sourceType: "module",
    });

    const dependencies = [];

    traverse.default(ast, {
        ImportDeclaration: ({ node }) => {
            dependencies.push(node.source.value);
        },
    });

    console.log(dependencies);
};

createAsset("./example/entry.js");
