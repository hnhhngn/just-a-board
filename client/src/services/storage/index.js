import * as local from "./LocalAdapter.js";
import * as server from "./ServerAdapter.js";

// Đổi 'local' hoặc 'server' ở đây tùy chọn
const MODE = "server";

const adapter = MODE === "server" ? server : local;

export const getIndex = adapter.getIndex;
export const create = adapter.create;
export const remove = adapter.remove;
export const save = adapter.save;
export const load = adapter.load;
export const rename = adapter.rename;
