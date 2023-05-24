
import fs from 'fs';
import path from 'path';

import lodash from 'lodash';
import detect from 'detect-file-type';
import pino from 'pino';

export { findStyle, findElementAtLevel, findAllElementsAtLevel, findElementAtPath, findElement, findAllElements };
export { isParagraph, isParagraphProperty, isListParagraph, isPictureParagraph, isTable, isRun, isHyperlink, isText, isFootnote, isChart, isViennaVizChart, isSuperscriptRun, isSubscriptRun, isBreak, isExcelReference };
export { mkdirhir, detectMimeTypeFromBuffer, getListInfo, makeLog, getLog, initTextTraceOut, textTraceOut }

function mkdirhir(dirs, chop = false) {

    let todo = [];

    if (! Array.isArray(dirs)) {
        dirs = [dirs];
    }
    
    for (let d of dirs) {
        let dp = path.parse(d);
        let subdirs;
        if (chop) {
            subdirs = dp.dir;
        } else {
            subdirs = d;
        }
        
        while (subdirs && subdirs !== '.' && subdirs !== path.sep) {
            // console.dir(dp);
            todo.push(subdirs);
            dp = path.parse(subdirs);
            subdirs = dp.dir;
        }
    }

    todo = lodash.uniq(todo);
    todo.sort();

    for (let d of todo) {
        if (! fs.existsSync(d)) {
            fs.mkdirSync(d);
        }
    }
}

function findStyle(xml_js) {

    if (! Array.isArray(xml_js.elements)) {
        return false;
    }
    
    let pPr = xml_js.elements.find( e => e.name === 'w:pPr' && e.type === 'element' && e.elements );

    if (! pPr) {
        return false;
    }

    let pStyle = pPr.elements.find( e => (e.name === 'w:pStyle' && e.type === 'element' && e.attributes && e.attributes['w:val']));

    if (pStyle) {
        return pStyle.attributes['w:val'];
    } else {
        return false;
    }
}

function isParagraph(xml_js) {

    if (isPictureParagraph(xml_js)) {
        return false;
    }
    
    let s = findStyle(xml_js);
    
    return (xml_js.name === 'w:p' && xml_js.type === 'element' && s !== 'excel-referenz');
}

function isParagraphProperty(xml_js) {
    
    return (xml_js.name === 'w:pPr' && xml_js.type === 'element');
}

function isListParagraph(docx, xml_js) {

    let e = findElement(xml_js, ['w:p', 'w:pPr', 'w:numPr'], {anchor: true});

    if (! e) {
        return false;
    }

    let info = getListInfo(docx, xml_js);

    if (! info) {
        return false;
    } else {
        return true;
    }
}

function isPictureParagraph(xml_js) {

    let e = findElement(xml_js, 'w:drawing', {minLeveL: 2})    

    return e ? true : false;
}

function isTable(xml_js) {

    return (xml_js.name === 'w:tbl' && xml_js.type === 'element');
}

function isRun(xml_js) {

    return (xml_js.name === 'w:r' && xml_js.type === 'element');
}

function isHyperlink(xml_js) {

    return (xml_js.name === 'w:hyperlink' && xml_js.type === 'element');
}

function isText(xml_js) {

    return (xml_js.name === 'w:t' && xml_js.type === 'element');
}

function isChart(xml_js) {

    
    let cnvpr = findElement(xml_js, ['pic:pic', 'pic:nvPicPr', 'pic:cNvPr']);
    let title = cnvpr?.attributes?.title;
        
    return title === 'Diagramm';    
}

function isViennaVizChart(xml_js) {

    
    let cnvpr = findElement(xml_js, ['pic:pic', 'pic:nvPicPr', 'pic:cNvPr']);
    let title = cnvpr?.attributes?.title;
        
    return title === 'ViennaViz Diagramm';    
}

function isFootnote(xml_js) {
    
    return (xml_js.name === 'w:footnoteReference' && xml_js.type === 'element');
}

function isSuperscriptRun(xml_js) {

    let e = findElement(xml_js, ['w:r', 'w:rPr', 'w:vertAlign']);

    return e?.attributes?.['w:val'] === 'superscript';
}

function isSubscriptRun(xml_js) {

    let e = findElement(xml_js, ['w:r', 'w:rPr', 'w:vertAlign']);

    return e?.attributes?.['w:val'] === 'subscript';
}

function isBreak(xml_js) {

    return ((xml_js.name === 'w:br' || xml_js.name === 'w:cr') && xml_js.type === 'element');
}

function isExcelReference(xml_js) {
    let s = findStyle(xml_js);

    if (s === 'excel-referenz') {
        return true;
    } else {
        return false;
    }
}

function findElementAtLevel(xml_js, predicate, minLevel = 0, maxLevel = 99999) {
    
    return findElementAtLevel1(xml_js, predicate, minLevel, maxLevel, 0);
}

function findElementAtLevel1(xml_js, predicate, minLevel, maxLevel, cur) {

    if (cur >= minLevel && cur <= maxLevel && predicate.call(null, xml_js)) {
        return xml_js;
    }
    
    if (! Array.isArray(xml_js.elements) || cur > maxLevel) {
        return null;
    }

    for (let e of xml_js.elements) {
        let x = findElementAtLevel1(e, predicate, minLevel, maxLevel, cur + 1);
        if (x) {
            return x;
        }
    }

    return null;
}

function findAllElementsAtLevel(xml_js, predicate, minLevel = 0, maxLevel = 99999) {

    let result = [];

    findAllElementsAtLevel1(xml_js, predicate, minLevel, maxLevel, 0, result);

    return result;
}

function findAllElementsAtLevel1(xml_js, predicate, minLevel, maxLevel, cur, result) {
    
    if (cur >= minLevel && cur <= maxLevel && predicate.call(null, xml_js)) {
        result.push(xml_js);
    }

    if (! Array.isArray(xml_js.elements) || cur > maxLevel) {
        return;
    }

    for (let e of xml_js.elements) {
        findAllElementsAtLevel1(e, predicate, minLevel, maxLevel, cur + 1, result);
    }
}

function findElementAtPath(xml_js, predicates) {

    if (predicates.length === 0) {
        return xml_js;
    } else {
        return findElementAtPath1(xml_js, predicates, 0);
    }
}
    
function findElementAtPath1(xml_js, predicates, off) {
 
    if (! predicates[off].call(null, xml_js)) {
        return null;
    }

    if (predicates.length === off + 1) {
        return xml_js;
    }

    if (! Array.isArray(xml_js.elements)) {
        return null;
    }
    
    for (let e of xml_js.elements) {
        let x = findElementAtPath1(e, predicates, off + 1);
        if (x) {
            return x;
        }
    }

    return null;
}

function findElement(xml_js, predicates, {minLevel = 0, maxLevel = 99999, maxCount = 99999, anchor = false} = {}) {

    maxCount = 1;
    
    let r = findAllElements(xml_js, predicates, {minLevel, maxLevel, maxCount, anchor});

    return r.length === 0 ? null : r[0];
}

function findAllElements(xml_js, predicates, {minLevel = 0, maxLevel = 99999, maxCount = 99999, anchor = false} = {}) {

    let result = [];

    if (! Array.isArray(predicates)) {
        predicates = [predicates];
    }

    findAllElementsPass1(xml_js, predicates, 0, 0, minLevel, maxLevel, maxCount, anchor, result);

    return result;
}

function findAllElementsPass1(xml_js, predicates, index, level, minLevel, maxLevel, maxCount, anchor, result) {

    // console.dir('pass1 ' + xml_js.name);
    
    if (result.length === maxCount) {
        return;
    }
    
    if (level < minLevel) {
        findAllElementsPass2(xml_js, predicates, index, level + 1, minLevel, maxLevel, maxCount, anchor, result);
        return;
    }
    
    if (level > maxLevel) {
        return;
    }

    if (! predicateMatch(xml_js, predicates[index])) {
        if (index === 0 && ! anchor) {
            findAllElementsPass2(xml_js, predicates, 0, level + 1, minLevel, maxLevel, maxCount, anchor, result);
        }
        return;
    }

    if (predicates.length === index + 1) {
        // TODO: Multiple matches in depth first?
        result.push(xml_js);
        return;
    }

    findAllElementsPass2(xml_js, predicates, index + 1, level + 1, minLevel, maxLevel, maxCount, anchor, result);
}

function findAllElementsPass2(xml_js, predicates, index, level, minLevel, maxLevel, maxCount, anchor, result) {

    // console.dir('pass2 ' + xml_js.name);
    
    if (! Array.isArray(xml_js.elements)) {
        return;
    }
    
    for (let e of xml_js.elements) {
        findAllElementsPass1(e, predicates, index, level, minLevel, maxLevel, maxCount, anchor, result);
        if (result.length === maxCount) {
            return;
        }
    }
}

function predicateMatch(xml_js, p) {

    if (typeof(p) === 'string') {
        if (xml_js.name) {
            return xml_js.name === p;
        } else {
            return false;
        }        
    } else {
        return p.call(null, xml_js);
    }
}

function detectMimeTypeFromBuffer(buf) {

    return new Promise((resolve, reject) => {
        detect.fromBuffer(buf, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

function getListInfo(docx, xml_js) {

    let p = e => e.name === 'w:numId';

    let e = findElementAtLevel(xml_js, p, 3, 3);

    let numId = e.attributes['w:val'];

    return docx.getAbstractNum(numId);

}

function makeLog(cla) {

    let logopts = {
            level: cla.logLevel,
            timestamp: false,
            formatters: {
                bindings: x => { return {};},
                level: (label, number) => {
                    return { level: label }
                }
            },
    };

    if (cla.logPrettyPrint) {
        logopts.transport = {
            target: 'pino-pretty',
            options: {
                ignore: 'loc',
                messageFormat: '{loc} {msg}',
                colorize: true,
            },
        };
        delete logopts.formatters.level;
    }

    getLog.log = pino(logopts);
}
    
function getLog() {
    
    if ( typeof getLog.log === 'undefined' ) {
        let logopts = {
            level: 'trace',
            timestamp: false,
            formatters: {
                bindings: x => { return {};},
                level (label, number) {
                    return { level: label }
                }
            },
        };
        console.log(getLog.abc);
        getLog.log = pino(logopts);
    }
        
    return getLog.log;
}

function initTextTraceOut(cla) {

    if (! cla.textTrace) {
        return;
    }
    
    textTraceOut.fn = cla.textTrace;
    fs.writeFileSync(textTraceOut.fn, '');
}

function textTraceOut(t) {

    if ( typeof(textTraceOut.fn) === 'undefined' ) {
        return;
    }

    fs.writeFileSync(textTraceOut.fn, t, {flag: 'as'});
}
