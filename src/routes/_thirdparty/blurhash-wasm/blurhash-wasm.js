/* eslint-disable */
// Forked from https://unpkg.com/browse/blurhash-wasm@0.2.0/blurhash_wasm.js
// to work around webpack issues with loading .wasm files in workers
// https://github.com/webpack/webpack/issues/7647
import { decode as decodeBase64 } from 'base64-arraybuffer';

let decodeFunc

export const setupPromise = (async () => {
  // from blurhash_wasm_bg.wasm
  const wasmContents = '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BCACIAg2AgAgA0EkaiADQThqKQMANwIAIAMgATYCGCADQdCDwAA2AhQgA0HQg8AANgIQIAMgAykDMDcCHEGklcAAKAIAIgFBf0wNAEGklcAAIAFBAWoiATYCAEGklcAAQayVwAAoAgAiAgR/QaiVwAAoAgAgA0EIaiAAQciEwAAoAgARBQAgAyADKQMINwMQIANBEGogAigCDBEFAEGklcAAKAIABSABC0F/ajYCACAEQQJJDQELAAsjAEEQayIBJAAgAUG4hMAANgIMIAEgADYCCAAL8QEBAX8jAEEQayIDJAAgAyABKAIAIgEoAgA2AgwCfwJAIAJBAmoiAiACbCICQYAQIAJBgBBLGyIEQQQgA0EMakGYg8AAQZiDwAAQCSICBEAgASADKAIMNgIADAELIANBmIPAACAEQQQQFgJAIAMoAgAEQCABIAMoAgw2AgAMAQsgAygCBCICIAMoAgw2AgggAyACNgIMIARBBCADQQxqQZiDwABBmIPAABAJIQIgASADKAIMNgIAIAINAQtBAQwBCyACQgA3AgQgAiACIARBAnRqQQJyNgIAQQALIQEgACACNgIEIAAgATYCACADQRBqJAAL2gEBBH8jAEEwayICJAAgAUEEaiEEIAEoAgRFBEAgASgCACEDIAJBADYCECACQgE3AwggAiACQQhqNgIUIAJBKGogA0EQaikCADcDACACQSBqIgUgA0EIaikCADcDACACIAMpAgA3AxggAkEUaiACQRhqEAQaIAUgAigCEDYCACACIAIpAwg3AxgCQCAEKAIAIgNFDQAgAUEIaigCACIBRQ0AIAMgAUEBEC0LIAQgAikDGDcCACAEQQhqIAUoAgA2AgALIABBzITAADYCBCAAIAQ2AgAgAkEwaiQAC9YBAgF/AX4jAEEQayIFJAAgBSABIAIgAyAEEAJBACEDQQAgBSgCBCAFLQAAQQFGGyEEIAVBCGopAwAhBiACBEAgASACQQEQLQtBACECAkACQCAERQ0AIAanIgEgBkIgiKciAkYEQCAEIQMgASECDAELIAEgAkkNASACBEAgBCABQQEgAhAqIgMNASACQQFBoJXAACgCACIAQQwgABsRBQAAC0EAIQJBASEDIAFFDQAgBCABQQEQLQsgACACNgIEIAAgAzYCACAFQRBqJAAPC0HQgsAAEBwAC8EBAQF/IwBBEGsiAyQAAkACQCAARQ0AIAMgADYCBCABRQ0AIAJBBEsNASABQQNqQQJ2QX9qIgBB/wFLDQEgAEECdEGEjcAAaiIARQ0BIANBgI3AADYCCCADIAAoAgA2AgwgA0EEaiADQQxqIANBCGpBgIPAABAOIAAgAygCDDYCAAsgA0EQaiQADwsgA0GAjcAAKAIANgIMIANBBGogA0EMakHogsAAQeiCwAAQDkGAjcAAIAMoAgw2AgAgA0EQaiQAC5IBAQJ/IAAoAgQiAiAAKAIIIgNrIAFJBEACQAJAIAEgA2oiASADSQ0AIAJBAXQiAyABIAEgA0kbIgFBAEgNAAJAIAIEQCAAKAIAIAJBASABECoiAkUNAQwDCyABQQEQLCICDQILIAFBAUGglcAAKAIAIgBBDCAAGxEFAAALEC8ACyAAIAI2AgAgAEEEaiABNgIACwtvAEEAIAJBAnQiASADQQN0QYCAAWoiAiACIAFJG0GHgARqIgJBEHZAACIBQRB0IAFBf0YbIgEEQCABQgA3AgQgASABIAJBgIB8cWpBAnI2AgAgACABNgIEIABBADYCAA8LIAAgATYCBCAAQQE2AgALdAIEfwF+IwBBMGsiASQAIABBDGoQKSECIAAoAggQKSEDIAFBCGogAikCADcCACABKQMIIQUgAigCCCEEIAEgAigCDDYCHCABIAQ2AhggASAFNwMQIAFBADYCJCABIAM2AiAgAUEgaiAAKAIIIAFBEGoQEAALbwEBfyMAQTBrIgEkACABQQQ2AgQgASAANgIAIAFBLGpBGDYCACABQRxqQQI2AgAgAUEYNgIkIAFCAjcCDCABQYiHwAA2AgggASABQQRqNgIoIAEgATYCICABIAFBIGo2AhggAUEIakGYh8AAEB8AC2wBAX8jAEEwayIDJAAgAyACNgIEIAMgATYCACADQSxqQRg2AgAgA0EcakECNgIAIANBGDYCJCADQgI3AgwgA0HghcAANgIIIAMgAzYCKCADIANBBGo2AiAgAyADQSBqNgIYIANBCGogABAfAAtvAQF/IwBBMGsiAiQAIAIgATYCBCACIAA2AgAgAkEsakEYNgIAIAJBHGpBAjYCACACQRg2AiQgAkICNwIMIAJBzIfAADYCCCACIAJBBGo2AiggAiACNgIgIAIgAkEgajYCGCACQQhqQdyHwAAQHwALVAEBfyMAQSBrIgIkACACIAAoAgA2AgQgAkEYaiABQRBqKQIANwMAIAJBEGogAUEIaikCADcDACACIAEpAgA3AwggAkEEaiACQQhqEAQgAkEgaiQAC2gCAX8DfiMAQTBrIgEkACAAKQIIIQIgACkCECEDIAApAgAhBCABQRRqQQA2AgAgASAENwMYIAFBnIXAADYCECABQgE3AgQgASABQRhqNgIAIAEgAzcDKCABIAI3AyAgASABQSBqEB8AC0wAAkACfyABQYCAxABHBEBBASAAKAIYIAEgAEEcaigCACgCEBEAAA0BGgsgAkUNASAAKAIYIAJBACAAQRxqKAIAKAIMEQYACw8LQQALPQEDfwJAIAIEQANAIAAgA2otAAAiBCABIANqLQAAIgVHDQIgA0EBaiIDIAJJDQALQQAPC0EADwsgBCAFawtKAgF/AX4jAEEgayICJAAgASkCACEDIAJBFGogASkCCDcCACACIAM3AgwgAiAANgIIIAJBnIXAADYCBCACQZyFwAA2AgAgAhAXAAspAAJAIABBfEsNACAABEAgACAAQX1JQQJ0ECwiAEUNASAADwtBBA8LAAsrACACBEADQCAAIAEtAAA6AAAgAEEBaiEAIAFBAWohASACQX9qIgINAAsLCykBAX8gAyACEAoiBARAIAQgACADIAEgASADSxsQISAAIAEgAhAUCyAECy4BAX8gACgCACIAIAIQFSAAIAAoAggiAyACajYCCCADIAAoAgBqIAEgAhAhQQALIQAgAQRAA0AgAEEAOgAAIABBAWohACABQX9qIgENAAsLCx8AAkAgAUF8Sw0AIAAgAUEEIAIQKiIARQ0AIAAPCwALJgEBfwJAIAAoAgQiAUUNACAAQQhqKAIAIgBFDQAgASAAQQEQLQsLGgAgAEIANwIEIABBBDYCACAAQQxqQgA3AgALGQEBfyAAKAIEIgEEQCAAKAIAIAFBARAtCwsSACAABEAgAA8LQaCEwAAQHAALDAAgACABIAIgAxAiCw8AIAEEQCAAIAFBBBAtCwsIACAAIAEQCgsKACAAIAEgAhAUCwsAIAA1AgAgARANCwoAQYSFwAAQHAALBQBBgAQLBABBAQsEACABCwQAQQALBwBBhJXAAAsMAELcseTb9vDi93ILDABC4Oi0/cfGvdh2CwMAAQsDAAELC4MNBQBBgIDAAAu0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';

  const buffer = decodeBase64(wasmContents)
  const wasm = (await WebAssembly.instantiate(buffer)).instance.exports;
  let WASM_VECTOR_LEN = 0;

  let cachedTextEncoder = new TextEncoder('utf-8');

  let cachegetUint8Memory = null;
  function getUint8Memory() {
    if (cachegetUint8Memory === null || cachegetUint8Memory.buffer !== wasm.memory.buffer) {
      cachegetUint8Memory = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory;
  }

  let passStringToWasm;
  if (typeof cachedTextEncoder.encodeInto === 'function') {
    passStringToWasm = function(arg) {

      let size = arg.length;
      let ptr = wasm.__wbindgen_malloc(size);
      let offset = 0;
      {
        const mem = getUint8Memory();
        for (; offset < arg.length; offset++) {
          const code = arg.charCodeAt(offset);
          if (code > 0x7F) break;
          mem[ptr + offset] = code;
        }
      }

      if (offset !== arg.length) {
        arg = arg.slice(offset);
        ptr = wasm.__wbindgen_realloc(ptr, size, size = offset + arg.length * 3);
        const view = getUint8Memory().subarray(ptr + offset, ptr + size);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
      }
      WASM_VECTOR_LEN = offset;
      return ptr;
    };
  } else {
    passStringToWasm = function(arg) {


      let size = arg.length;
      let ptr = wasm.__wbindgen_malloc(size);
      let offset = 0;
      {
        const mem = getUint8Memory();
        for (; offset < arg.length; offset++) {
          const code = arg.charCodeAt(offset);
          if (code > 0x7F) break;
          mem[ptr + offset] = code;
        }
      }

      if (offset !== arg.length) {
        const buf = cachedTextEncoder.encode(arg.slice(offset));
        ptr = wasm.__wbindgen_realloc(ptr, size, size = offset + buf.length);
        getUint8Memory().set(buf, ptr + offset);
        offset += buf.length;
      }
      WASM_VECTOR_LEN = offset;
      return ptr;
    };
  }

  let cachegetInt32Memory = null;
  function getInt32Memory() {
    if (cachegetInt32Memory === null || cachegetInt32Memory.buffer !== wasm.memory.buffer) {
      cachegetInt32Memory = new Int32Array(wasm.memory.buffer);
    }
    return cachegetInt32Memory;
  }

  function getArrayU8FromWasm(ptr, len) {
    return getUint8Memory().subarray(ptr / 1, ptr / 1 + len);
  }
  /**
   * @param {string} blur_hash
   * @param {number} width
   * @param {number} height
   * @returns {Uint8Array}
   */
  decodeFunc = function decode(blur_hash, width, height) {
    const retptr = 8;
    const ret = wasm.decode(retptr, passStringToWasm(blur_hash), WASM_VECTOR_LEN, width, height);
    const memi32 = getInt32Memory();
    let v0;
    if (memi32[retptr / 4 + 0] !== 0) {
      v0 = getArrayU8FromWasm(memi32[retptr / 4 + 0], memi32[retptr / 4 + 1]).slice();
      wasm.__wbindgen_free(memi32[retptr / 4 + 0], memi32[retptr / 4 + 1] * 1);
    }
    return v0;
  }
})();

export function decode(blur_hash, width, height) {
  return decodeFunc(blur_hash, width, height);
}

/* eslint-enable */
