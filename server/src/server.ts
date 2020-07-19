import './socket';
import { configure } from "log4js";

configure({
    appenders: {
        everything: {
            type: "dateFile", filename: "logs/musicquiz.log"
        }
    },
    categories: {
        default: {
            appenders: ["everything"], level: "all"
        }
    }
});