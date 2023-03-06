import * as vscode from "vscode";
import * as fs from "fs";

export function activate(context: vscode.ExtensionContext) {
	// Register a command to be executed when the user runs "LogLess" from the command palette
	context.subscriptions.push(
		vscode.commands.registerCommand("logless.clean", async () => {
			const rootPath = vscode.workspace.rootPath;
			if (!rootPath) {
				// If the workspace is not open, show an error message
				vscode.window.showErrorMessage("LogLess: No workspace open.");
				return;
			}

			// Prompt the user to select directories to exclude
			const selectedDirectories = await vscode.window.showQuickPick(
				fs
					.readdirSync(rootPath, { withFileTypes: true })
					.filter((path) => path.isDirectory() && path.name !== "node_modules")
					.map((path) => path.name),
				{
					canPickMany: true,
					placeHolder: "Select the directories to exclude from cleaning:",
				}
			);
			if (!selectedDirectories) {
				// If the user cancelled the selection, don't proceed
				return;
			}
			const excludeDirectories = ["node_modules", ...selectedDirectories];

			// Show a consent dialog to inform the user of the severity of the cleaning operation
			const confirmed = await vscode.window.showWarningMessage(
				`Are you sure you want to remove all console.log statements from the selected directories (${excludeDirectories.join(
					", "
				)})? This action cannot be undone.`,
				{ modal: true },
				"Yes, clean up console logs"
			);
			if (!confirmed) {
				// If the user didn't confirm, don't proceed
				return;
			}

			// Start the cleaning process
			cleanDirectory(rootPath, excludeDirectories);

			// Show a notification to indicate that the cleaning process is complete
			vscode.window.showInformationMessage(
				"LogLess: Cleaned up console.log statements."
			);
		})
	);
}

function cleanDirectory(path: string, excludeDirectories: string[]) {
	// Retrieve all files and directories within the specified directory
	const allPaths = fs.readdirSync(path, { withFileTypes: true });

	// Filter out directories that should be excluded
	const pathsToProcess = allPaths.filter(
		(path) => path.isDirectory() && !excludeDirectories.includes(path.name)
	);

	// Loop through all files and directories within the specified directory
	pathsToProcess.forEach((path) => {
		const fullPath = `${path}/${path.name}`;
		const isJavascriptFile = path.isFile() && /\.(js|jsx|mjs)$/.test(path.name);
		const isTypescriptFile = path.isFile() && /\.(ts|tsx)$/.test(path.name);
		const isVueFile = path.isFile() && /\.vue$/.test(path.name);
		const isSvelteFile = path.isFile() && /\.svelte$/.test(path.name);
		const isDenoFile = path.isFile() && /\.(ts|js)$/.test(path.name);
		const isRustFile = path.isFile() && /\.(rs)$/.test(path.name);

		if (
			isJavascriptFile ||
			isTypescriptFile ||
			isVueFile ||
			isSvelteFile ||
			isDenoFile ||
			isRustFile
		) {
			// If the path is a JS file, remove all instances of "console.log" and save the file
			const fileContents = fs.readFileSync(fullPath, { encoding: "utf8" });
			const newFileContents = fileContents.replace(
				/console\.log\(.*\);?\n?/g,
				""
			);
			fs.writeFileSync(fullPath, newFileContents, { encoding: "utf8" });
		} else if (path.isDirectory()) {
			// If the path is a directory, recursively process all files within the directory
			cleanDirectory(fullPath, excludeDirectories);
		}
	});
}
