var props;
var lastToastTime;

function relationConstToString(relationConst) {
  switch(relationConst) {
    case Relation.LE:
      return '<=';
    case Relation.EQ:
      return '=';
    case Relation.GE:
      return '>=';
    case Relation.INT:
      return 'int';
    case Relation.BIN:
      return 'bin';
    case Relation.ALLDIFF:
      return 'alldiff';
    default:
      throw 'Unknown relation';
  }
}

function relationConstToAmpl(relationConst) {
  switch(relationConst) {
    case Relation.LE:
      return '<=';
    case Relation.EQ:
      return '==';
    case Relation.GE:
      return '>=';
    case Relation.INT:
    case Relation.BIN:
    case Relation.ALLDIFF:
    default:
      throw 'Unknown relation';
  }
}

function relationConstHasRHS(relationConst) {
  switch(relationConst) {
    case Relation.LE:
    case Relation.EQ:
    case Relation.GE:
      return true;
    case Relation.INT:
    case Relation.BIN:
    case Relation.ALLDIFF:
      return false;
    default:
      throw 'Unknown relation';
  }
}

function setProperty(sheet, name, value) {
  props = props || PropertiesService.getDocumentProperties();
  props.setProperty(sheet.getSheetId() + '!' + name, value);
}

function setProperties(sheet, properties) {
  props = props || PropertiesService.getDocumentProperties();
  var newProps = {};
  for (var key in properties) {
    if (properties.hasOwnProperty(key)) {
      newProps[sheet.getSheetId() + '!' + key] = properties[key];
    }
  }
  props.setProperties(newProps);
}

function getProperty(sheet, name) {
  props = props || PropertiesService.getDocumentProperties();
  return props.getProperty(sheet.getSheetId() + '!' + name);
}

function getAllProperties() {
  props = props || PropertiesService.getDocumentProperties();
  return props.getProperties();
}

function clearAllProperties() {
  props = props || PropertiesService.getDocumentProperties();
  props.deleteAllProperties();
}

function delProperty(sheet, key) {
  props = props || PropertiesService.getDocumentProperties();
  props.deleteProperty(sheet.getSheetId() + '!' + key);
}

function showMessage(message, title) {
  var ui = SpreadsheetApp.getUi();
  if (title) {
    ui.alert(title, message, ui.ButtonSet.OK);
  } else {
    ui.alert(message);
  }
}

function showError(e) {
  showMessage(e.message, e.title);
}

function getRangeDims(range) {
  return { rows: range.getNumRows(), cols: range.getNumColumns() };
}

function getRangeSize(range) {
  return range.getNumRows() * range.getNumColumns();
}

function checkRangeIntersect(range1, range2) {
  var result = false;
  if (range1 && range2 &&
      range1.getSheet().getName() === range2.getSheet().getName()) {
    var r1x1 = range1.getRow();
    var r1x2 = range1.getLastRow();
    var r1y1 = range1.getColumn();
    var r1y2 = range1.getLastColumn();
    var r2x1 = range2.getRow();
    var r2x2 = range2.getLastRow();
    var r2y1 = range2.getColumn();
    var r2y2 = range2.getLastColumn();

    result = !(r1x1 > r2x2 || r1x2 < r2x1 || r1y1 > r2y2 && r1y2 < r2y1);
  }
  return result;
}

function getRangeIntersect(range1, range2) {
  var result = null;
  if (range1 && range2 &&
      range1.getSheet().getName() === range2.getSheet().getName()) {
    var r1x1 = range1.getRow();
    var r1x2 = range1.getLastRow();
    var r1y1 = range1.getColumn();
    var r1y2 = range1.getLastColumn();
    var r2x1 = range2.getRow();
    var r2x2 = range2.getLastRow();
    var r2y1 = range2.getColumn();
    var r2y2 = range2.getLastColumn();

    // find intersection:
    var xL = Math.max(r1x1, r2x1);
    var xR = Math.min(r1x2, r2x2);
    if (xR >= xL) {
      var yT = Math.max(r1y1, r2y1);
      var yB = Math.min(r1y2, r2y2);
      if (yB >= yT) {
        result = range1.getSheet().getRange(xL, yB, xR - xL + 1, yB - yT + 1);
      }
    }
  }
  return result;
}

function valueIsError(value) {
  var errorValues = ['#DIV/0!', '#NUM!', '#N/A', '#VALUE!'];
  for (var i = 0; i < errorValues.length; i++) {
    if (value === errorValues[i]) {
      return true;
    }
  }
  return false;
}

function createArray(length) {
  var arr = new Array(length || 0);
  var i = length;

  if (arguments.length > 1) {
    var args = Array.prototype.slice.call(arguments, 1);
    while(i--) arr[length-1 - i] = createArray.apply(this, args);
  }

  return arr;
}

function updateStatus(msg, title, priority, timeoutSeconds) {
  if (openSolver && openSolver.showStatus) {
    lastToastTime = lastToastTime || 0;
    var now = new Date().getTime();
    if (now - lastToastTime > (TOAST_TIMEOUT) * 1000 || priority) {
      SpreadsheetApp.getActiveSpreadsheet().toast(msg, title,
                                                  timeoutSeconds || null);
      lastToastTime = now;
    }
  }
}

function checkValueIsNumeric(value, errorInvalid, errorNotNumeric) {
  if (valueIsError(value)) {
    throw(errorInvalid());
  } else if (typeof(value) !== 'number') {
    // An empty cell has value '' (the empty string)
    // This is different to Excel where empty cells have value 0
    // We set this to value 0 so that we don't run into issues later on
    if (value === '') {
      value = 0;
    } else {
      throw(errorNotNumeric());
    }
  }
  return value;
}

function checkRangeValuesNumeric(range, errorInvalid, errorNotNumeric) {
  var values = range.getValues();
  for (var i = 0; i < values.length; i++) {
    for (var j = 0; j < values[i].length; j++) {
      values[i][j] = checkValueIsNumeric(
        values[i][j],
        function() {
          var cellName = range.getCell(i + 1, j + 1).getA1Notation();
          return errorInvalid(cellName);
        },
        function() {
          var cellName = range.getCell(i + 1, j + 1).getA1Notation();
          return errorNotNumeric(cellName);
        }
      );
    }
  }
  return values;
}

function removeSheetNameFromRange(rangeNotation, sheetName) {
  if (sheetName + '' && rangeNotation + '') {
    var searchString = sheetName + '!';
    if (rangeNotation.indexOf(searchString) === 0) {
      return rangeNotation.substr(searchString.length);
    }
  }
  return rangeNotation;
}

function getSheetNameFromRange(rangeNotation) {
  var values = rangeNotation.split("!");
  if (values.length === 1) {
    return values[0];
  } else if (values.length === 2) {
    return values[0];
  } else {
    return null;
  }
}

function isBool(value) {
  return typeof value === 'boolean';
}

function isNumber(value) {
  return typeof value === 'number' && !isNaN(value);
}

function isInt(value) {
  return isNumber(value) && Math.floor(value) == value;
}


/**
 * Returns the name of a sheet for use in a range expression (Sheet!Range)
 *
 * @param {Sheet} sheet the sheet to get the name from
 * @return {String} the escaped name of the sheet
 */
function escapeSheetName(sheet) {
  // TODO escape this. figure out which characters force quoting
  return sheet.getSheetName();
}

function getRangeNotation(sheet, range) {
  return escapeSheetName(sheet) + '!' + range.getA1Notation();
}
