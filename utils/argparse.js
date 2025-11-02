/* Intended for parsing custom macros' raw argument strings.

Format:
default_arg param1= value param2= value flag1= flag2= param3= value

All values are evaluated as TwineScript exprs. 
i.e., when you call this function, the final values will be resolved already.

Param names are [A-z0-9_].
*/

/* My wishlist:
- TODO less stupid error messages
*/

(() => {

/* Constants */
const DEFAULT = '_default';
const TYPE_RAW = 'raw';
const TYPE_TWINE = 'tws';
const TYPE_LINK = 'link';
const TYPE_FLAG = 'flag';
const TYPES = [
  TYPE_RAW,
  TYPE_TWINE,
  TYPE_LINK,
  TYPE_FLAG
];

const RE_PARAM = /^[A-z0-9_]+$/;

function parse(rawString, allowDefault=false) {

  /* Matches all sequences of `param1= value`, incl. `flag1=`, and default_arg */
  const reMatch = /(?:(?:([A-z0-9_]+=)(.*?))|(^.*?))(?=[A-z0-9_]+=|$)/g;

  const record = {};

  const matches = [...rawString.matchAll(reMatch)];

  /* Error if combining all the tokens isn't equal to the original string */
  /* TODO this probably doesn't catch all possible errors haha */
  if (matches.flatMap(e => e[0]).join('') !== rawString) {
    throw new Error("invalid arguments");
  }

  for (const match of matches) {

    /* Handling default argument at the start */
    if (match[3] !== undefined) {
      if (allowDefault) {
        record[DEFAULT] = match[3];
        continue;
      } else {
        throw new Error("malformed arg at the start");
      }
    }

    /* Validate param */
    const param = match[1].replace('=', '');
    if (param === DEFAULT) {
      throw new Error(`${DEFAULT} is a prohibited param`)
    }

    /* Validate arg */
    const arg = match[2].trim();

    record[param] = arg;
  }

  return record;
}

function validDetails(details) {

  /* details object spec:
  {
    param: {
      type: one of TYPES,
      default: any
    },
    ...
  }
  */

  const goodDetails = {};

  for (const [param, {type: type, default: defaultValue}] of Object.entries(details)) {

    /* valid param name */
    if (param.match(RE_PARAM) === null) {
      throw new Error("invalid param in details object");
    }

    /* type exists and type is one of TYPES */
    /* default type is twine expr */
    let goodType = TYPE_TWINE;

    if (type !== undefined) {

      if (! (TYPES.includes(type))) {
        throw new Error(`invalid type ${type} in details object`);
      }
      
      goodType = type;
    } 

    goodDetails[param] = {
      type: goodType,
      default: defaultValue,
    }
  }

  return goodDetails;
}

const evalTwine = Scripting.evalTwineScript;

function evalLink(string) {
  /* specs: see WikifierUtil.parseSquareBracketedMarkup(string); 
  */

  const linkMarkup = WikifierUtil.parseSquareBracketedMarkup(string);

  /* error if image we dont fw that rn */
  if (linkMarkup.isImage) {
    throw new Error("can't parse image link markup");
  }

  return linkMarkup;

  /* Notes on WikifierUtil.parseSquareBracketedMarkup() return object
  properties:
    (irrelevant, for images, prohibited)
    .isImage : bool
    .align = 'left' | 'right'
    .source : str

    (irrelevant)
    .forceInternal : bool

    .isLink : bool
    .link : str
    .setter : str
    .text : str
  */
}

function evalFlag(string) {
  /* specs:
  values:
    '' | 'true' | 'false' | true | false
  return:
    bool

  it's possible to have the boolean values true/false from the default value
  */

  switch (string) {
    case '':
      /* writing `flag1=` signifies flag's presence */
      return true;
    case 'true':
      return true;
    case 'false':
      return false;
    default:
      throw new Error(`${string} invalid arg for a flag param`);
  }
}

function emptyOrDefault(arg, def) {
  if (arg === '') {
    if (def !== undefined) {
      return def;
    } else {
      throw new Error(`invalid arg: empty`);
    }
  } else {
    return arg;
  }
}

function evalArg(rawArg, detail) {
  const arg = rawArg.trim();


  switch (detail.type) {
    case TYPE_TWINE:
      const tws = emptyOrDefault(arg, detail.default);
      return evalTwine(tws);
    
    case TYPE_LINK:
      const link = emptyOrDefault(arg, detail.default);
      return evalLink(link);

    case TYPE_FLAG:
      return evalFlag(arg);

    case TYPE_RAW:
      /* No processing whatsoever */
      return rawArg.trim();
  
    default:
      throw new Error();
  }
}

function evaluate(parsedRecord, details, defaultParam) {

  const ret = {};

  /* Tracker for which params have been evaled, for setting default values or throwing errors */
  // const paramsEvaled = new Map(Object.keys(details).map(p => [p, false]));
  const paramsEvaled = Object.fromEntries(
    Object.keys(details).map(p => [p, false])
  )

  /* handle the default arg by evaluating it based on defaultParam */
  if (defaultParam !== undefined && DEFAULT in parsedRecord) {
    ret[defaultParam] = evalArg(parsedRecord[DEFAULT], details[defaultParam]);
    paramsEvaled[defaultParam] = true;
  }

  /* looping thru parsedRecord, evaluate each arg based on details */
  for (const [param, value] of Object.entries(parsedRecord)) {
    
    /* yes this will override the default arg haha that's intentional because LTR */
    if (param === DEFAULT) {
      continue;
    }

    /* error if param not in details */
    if (! (param in details) ) {
      throw new Error(`invalid param ${param}`);
    }
    ret[param] = evalArg(value, details[param]);
    paramsEvaled[param] = true;
  }

  /* looping thru params not yet evaled */
  for (const param of Object.keys(paramsEvaled).filter(k => !paramsEvaled[k])) {
    
    /* if default exists, use it. else, error */
    if ('default' in details[param]) {
      ret[param] = details[param].default;
    } else {
      throw new Error(`no param ${param}`)
    }
  }

  return ret;

}

function argparse(raw, details, defaultParam) {

  /* validate function params */
  const valid = validDetails(details);

  if (defaultParam !== undefined) {
    if (defaultParam.match(RE_PARAM) === null) {
      throw new Error(`invalid param name ${defaultParam}`);
    } 

    if (! (defaultParam in details)) {
      throw new Error(`default param name ${defaultParam} not in passed details object`);
    }
  }

  if (! typeof details === 'object') {
    throw new Error("bad/no details param");
  }

  return evaluate(
    parse(
      raw,
      defaultParam !== undefined
    ),
    details,
    defaultParam
  );
}

/* EXPORTS */
const UTILS = 'io_utils';

if (! (UTILS in setup)) {
  setup[UTILS] = {};
}

setup[UTILS].argparse = argparse;

})();