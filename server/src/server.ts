import './socket';
import { configure } from "log4js";
import './rest'

configure({
    appenders: {
        everything: {
            type: "dateFile", filename: "logs/songclasher.log"
        }
    },
    categories: {
        default: {
            appenders: ["everything"], level: "all"
        }
    }
});

setInterval(function(){
    global.gc();
}, 1000*30)