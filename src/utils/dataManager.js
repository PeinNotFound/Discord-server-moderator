const fs = require('fs');
const path = require('path');

/**
 * Data persistence manager for JSON files
 */

class DataManager {
    constructor(filename) {
        this.filePath = path.join(__dirname, '..', filename);
        this.data = this.load();
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
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
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
