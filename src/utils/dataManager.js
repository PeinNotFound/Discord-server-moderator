const fs = require('fs');
const path = require('path');

/**
 * Data persistence manager for JSON files
 */

class DataManager {
    constructor(filename) {
        this.filePath = path.join(__dirname, '..', filename);
        this.data = this.load();
        this.saveTimeout = null;
        this.lastSave = Date.now();
        this.pendingChanges = false;

        // Save on exit - Ensure listeners are added only once
        if (!DataManager.listenersAttached) {
            process.on('SIGINT', () => {
                this.forceSave();
                process.exit();
            });

            process.on('exit', () => {
                this.forceSave();
            });

            DataManager.listenersAttached = true;
        }
    }

    load() {
        try {
            if (fs.existsSync(this.filePath)) {
                const data = fs.readFileSync(this.filePath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error(`Error loading ${this.filePath}:`, error);
        }
        return { jailedUsers: {}, warnedUsers: {} };
    }

    save() {
        this.pendingChanges = true;

        // If a save is already scheduled, do nothing
        if (this.saveTimeout) {
            return;
        }

        // Schedule a save in 30 seconds
        this.saveTimeout = setTimeout(() => {
            this.forceSave();
        }, 30000); // 30 seconds
    }

    forceSave() {
        if (!this.pendingChanges) return;

        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
            // console.log(`💾 Data saved to ${path.basename(this.filePath)}`);
            this.pendingChanges = false;
            this.lastSave = Date.now();

            if (this.saveTimeout) {
                clearTimeout(this.saveTimeout);
                this.saveTimeout = null;
            }
        } catch (error) {
            console.error(`Error saving ${this.filePath}:`, error);
        }
    }

    get(key) {
        return this.data[key];
    }

    set(key, value) {
        this.data[key] = value;
        this.save();
    }

    delete(key) {
        delete this.data[key];
        this.save();
    }

    getAll() {
        return this.data;
    }
}

module.exports = DataManager;
