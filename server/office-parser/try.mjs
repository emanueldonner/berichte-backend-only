#!/usr/bin/env node
'use strict';

import path from 'path';
import fs from 'fs';

import { xml2js } from 'xml-js';

import { findElement, findAllElements } from './lib/lib.js';

import yaml from 'yaml';

import ExcelJS from 'exceljs';

import printf  from 'printf';


let o = process.stdout;

let f1 = 8.577;



printf(o, '%.2f\n', f1);
printf(o, '%.7f\n', f1);
printf(o, '%.0f\n', f1);
