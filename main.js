const { Plugin } = require("obsidian");

function unifyIndentation(line) {
    // For example, treat each tab as 4 spaces
    return line.replace(/\t/g, "    ");
}

function getIndent(line) {
    const unified = unifyIndentation(line);
    return unified.search(/\S/);
}  

function iterateCurLevel(lines, updatedLines, curind) {
    let levelindent = getIndent(lines[curind]);
    let i = curind;
    let all_checked = true;

    while (i< lines.length) {
        let trimmed = lines[i].trim();

        // check if is task first
        if (!(trimmed.length == 0 || trimmed.startsWith("- [ ]") || trimmed.startsWith("- [x]"))) {
            return [all_checked, i];
        } else if (trimmed.length == 0) {
            // do nothing
            i++;
        } else {
            if (getIndent(lines[i]) > levelindent) {
                // entering subtask level
                const [ifchecked, newi] = iterateCurLevel(lines, updatedLines, i);
                all_checked = all_checked && ifchecked;
                let trimmedi_1 = lines[i-1].trim();
                if (trimmedi_1.startsWith("- [ ]") && ifchecked) {
                    // console.log(`update ${i-1} to checked`);
                    updatedLines[i-1] = updatedLines[i-1].replace("- [ ]", "- [x]");
                } else if (trimmedi_1.startsWith("- [x]") && !ifchecked) {
                    // console.log(`update ${i-1} to unchecked`);
                    updatedLines[i-1] = updatedLines[i-1].replace("- [x]", "- [ ]");
                }
                i = newi;
            } else if (getIndent(lines[i]) == levelindent) {
                all_checked = all_checked && trimmed.startsWith("- [x]");
                i++;
            } else {
                // leaving current level
                return [all_checked, i];
            }
        }
    }
    return [all_checked, i];
}

class AutoChecklistPlugin extends Plugin {
    async onload() {
        console.log("AutoChecklist Plugin Loaded");
        
        this.registerEvent(
            this.app.vault.on("modify", async (file) => {
                // console.log("modified");
                if (file.extension !== "md") return;

                let content = await this.app.vault.read(file);
                let lines = content.split("\n");

                let updatedLines = [...lines];
                let i = 0;
                while (i<lines.length) {
                    i=iterateCurLevel(lines, updatedLines, i)[1]+1;
                }

                // Rewrite file if changed
                let newContent = updatedLines.join("\n");
                if (newContent !== content) {
                    await this.app.vault.modify(file, newContent);
                }
            })
        );

        this.registerEvent(
            this.app.workspace.on("file-open", async (file) => {
                // console.log("open file");
                // Ensure we have a file, and it's markdown
                if (!file || file.extension !== "md") return;
                
                let content = await this.app.vault.read(file);
                let lines = content.split("\n");
                let updatedLines = [...lines];
            
                let i = 0;
                while (i < lines.length) {
                    i=iterateCurLevel(lines, updatedLines, i)[1]+1;
                }
            
                let newContent = updatedLines.join("\n");
                if (newContent !== content) {
                    await this.app.vault.modify(file, newContent);
                }
            })
        );      
    }

    onunload() {
        console.log("AutoChecklist Plugin Unloaded");
    }
}

module.exports = AutoChecklistPlugin;
  