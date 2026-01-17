var sdk_web;
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "../../node_modules/@journeyapps/wa-sqlite/src/sqlite-api.js"
/*!*******************************************************************!*\
  !*** ../../node_modules/@journeyapps/wa-sqlite/src/sqlite-api.js ***!
  \*******************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Factory: () => (/* binding */ Factory),
/* harmony export */   SQLITE_ABORT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_ABORT),
/* harmony export */   SQLITE_ACCESS_EXISTS: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_ACCESS_EXISTS),
/* harmony export */   SQLITE_ACCESS_READ: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_ACCESS_READ),
/* harmony export */   SQLITE_ACCESS_READWRITE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_ACCESS_READWRITE),
/* harmony export */   SQLITE_ALTER_TABLE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_ALTER_TABLE),
/* harmony export */   SQLITE_ANALYZE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_ANALYZE),
/* harmony export */   SQLITE_ATTACH: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_ATTACH),
/* harmony export */   SQLITE_AUTH: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_AUTH),
/* harmony export */   SQLITE_BLOB: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_BLOB),
/* harmony export */   SQLITE_BUSY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_BUSY),
/* harmony export */   SQLITE_CANTOPEN: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CANTOPEN),
/* harmony export */   SQLITE_CONSTRAINT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CONSTRAINT),
/* harmony export */   SQLITE_CONSTRAINT_CHECK: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CONSTRAINT_CHECK),
/* harmony export */   SQLITE_CONSTRAINT_COMMITHOOK: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CONSTRAINT_COMMITHOOK),
/* harmony export */   SQLITE_CONSTRAINT_FOREIGNKEY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CONSTRAINT_FOREIGNKEY),
/* harmony export */   SQLITE_CONSTRAINT_FUNCTION: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CONSTRAINT_FUNCTION),
/* harmony export */   SQLITE_CONSTRAINT_NOTNULL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CONSTRAINT_NOTNULL),
/* harmony export */   SQLITE_CONSTRAINT_PINNED: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CONSTRAINT_PINNED),
/* harmony export */   SQLITE_CONSTRAINT_PRIMARYKEY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CONSTRAINT_PRIMARYKEY),
/* harmony export */   SQLITE_CONSTRAINT_ROWID: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CONSTRAINT_ROWID),
/* harmony export */   SQLITE_CONSTRAINT_TRIGGER: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CONSTRAINT_TRIGGER),
/* harmony export */   SQLITE_CONSTRAINT_UNIQUE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CONSTRAINT_UNIQUE),
/* harmony export */   SQLITE_CONSTRAINT_VTAB: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CONSTRAINT_VTAB),
/* harmony export */   SQLITE_COPY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_COPY),
/* harmony export */   SQLITE_CORRUPT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CORRUPT),
/* harmony export */   SQLITE_CREATE_INDEX: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CREATE_INDEX),
/* harmony export */   SQLITE_CREATE_TABLE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CREATE_TABLE),
/* harmony export */   SQLITE_CREATE_TEMP_INDEX: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CREATE_TEMP_INDEX),
/* harmony export */   SQLITE_CREATE_TEMP_TABLE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CREATE_TEMP_TABLE),
/* harmony export */   SQLITE_CREATE_TEMP_TRIGGER: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CREATE_TEMP_TRIGGER),
/* harmony export */   SQLITE_CREATE_TEMP_VIEW: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CREATE_TEMP_VIEW),
/* harmony export */   SQLITE_CREATE_TRIGGER: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CREATE_TRIGGER),
/* harmony export */   SQLITE_CREATE_VIEW: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CREATE_VIEW),
/* harmony export */   SQLITE_CREATE_VTABLE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_CREATE_VTABLE),
/* harmony export */   SQLITE_DELETE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DELETE),
/* harmony export */   SQLITE_DENY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DENY),
/* harmony export */   SQLITE_DETACH: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DETACH),
/* harmony export */   SQLITE_DETERMINISTIC: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DETERMINISTIC),
/* harmony export */   SQLITE_DIRECTONLY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DIRECTONLY),
/* harmony export */   SQLITE_DONE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DONE),
/* harmony export */   SQLITE_DROP_INDEX: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DROP_INDEX),
/* harmony export */   SQLITE_DROP_TABLE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DROP_TABLE),
/* harmony export */   SQLITE_DROP_TEMP_INDEX: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DROP_TEMP_INDEX),
/* harmony export */   SQLITE_DROP_TEMP_TABLE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DROP_TEMP_TABLE),
/* harmony export */   SQLITE_DROP_TEMP_TRIGGER: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DROP_TEMP_TRIGGER),
/* harmony export */   SQLITE_DROP_TEMP_VIEW: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DROP_TEMP_VIEW),
/* harmony export */   SQLITE_DROP_TRIGGER: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DROP_TRIGGER),
/* harmony export */   SQLITE_DROP_VIEW: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DROP_VIEW),
/* harmony export */   SQLITE_DROP_VTABLE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DROP_VTABLE),
/* harmony export */   SQLITE_EMPTY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_EMPTY),
/* harmony export */   SQLITE_ERROR: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_ERROR),
/* harmony export */   SQLITE_FCNTL_BEGIN_ATOMIC_WRITE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_BEGIN_ATOMIC_WRITE),
/* harmony export */   SQLITE_FCNTL_BUSYHANDLER: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_BUSYHANDLER),
/* harmony export */   SQLITE_FCNTL_CHUNK_SIZE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_CHUNK_SIZE),
/* harmony export */   SQLITE_FCNTL_CKPT_DONE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_CKPT_DONE),
/* harmony export */   SQLITE_FCNTL_CKPT_START: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_CKPT_START),
/* harmony export */   SQLITE_FCNTL_COMMIT_ATOMIC_WRITE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_COMMIT_ATOMIC_WRITE),
/* harmony export */   SQLITE_FCNTL_COMMIT_PHASETWO: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_COMMIT_PHASETWO),
/* harmony export */   SQLITE_FCNTL_DATA_VERSION: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_DATA_VERSION),
/* harmony export */   SQLITE_FCNTL_FILE_POINTER: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_FILE_POINTER),
/* harmony export */   SQLITE_FCNTL_GET_LOCKPROXYFILE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_GET_LOCKPROXYFILE),
/* harmony export */   SQLITE_FCNTL_HAS_MOVED: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_HAS_MOVED),
/* harmony export */   SQLITE_FCNTL_JOURNAL_POINTER: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_JOURNAL_POINTER),
/* harmony export */   SQLITE_FCNTL_LAST_ERRNO: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_LAST_ERRNO),
/* harmony export */   SQLITE_FCNTL_LOCKSTATE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_LOCKSTATE),
/* harmony export */   SQLITE_FCNTL_LOCK_TIMEOUT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_LOCK_TIMEOUT),
/* harmony export */   SQLITE_FCNTL_MMAP_SIZE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_MMAP_SIZE),
/* harmony export */   SQLITE_FCNTL_OVERWRITE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_OVERWRITE),
/* harmony export */   SQLITE_FCNTL_PDB: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_PDB),
/* harmony export */   SQLITE_FCNTL_PERSIST_WAL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_PERSIST_WAL),
/* harmony export */   SQLITE_FCNTL_POWERSAFE_OVERWRITE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_POWERSAFE_OVERWRITE),
/* harmony export */   SQLITE_FCNTL_PRAGMA: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_PRAGMA),
/* harmony export */   SQLITE_FCNTL_RBU: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_RBU),
/* harmony export */   SQLITE_FCNTL_RESERVE_BYTES: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_RESERVE_BYTES),
/* harmony export */   SQLITE_FCNTL_ROLLBACK_ATOMIC_WRITE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_ROLLBACK_ATOMIC_WRITE),
/* harmony export */   SQLITE_FCNTL_SET_LOCKPROXYFILE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_SET_LOCKPROXYFILE),
/* harmony export */   SQLITE_FCNTL_SIZE_HINT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_SIZE_HINT),
/* harmony export */   SQLITE_FCNTL_SIZE_LIMIT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_SIZE_LIMIT),
/* harmony export */   SQLITE_FCNTL_SYNC: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_SYNC),
/* harmony export */   SQLITE_FCNTL_SYNC_OMITTED: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_SYNC_OMITTED),
/* harmony export */   SQLITE_FCNTL_TEMPFILENAME: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_TEMPFILENAME),
/* harmony export */   SQLITE_FCNTL_TRACE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_TRACE),
/* harmony export */   SQLITE_FCNTL_VFSNAME: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_VFSNAME),
/* harmony export */   SQLITE_FCNTL_VFS_POINTER: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_VFS_POINTER),
/* harmony export */   SQLITE_FCNTL_WAL_BLOCK: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_WAL_BLOCK),
/* harmony export */   SQLITE_FCNTL_WIN32_AV_RETRY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_WIN32_AV_RETRY),
/* harmony export */   SQLITE_FCNTL_WIN32_GET_HANDLE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_WIN32_GET_HANDLE),
/* harmony export */   SQLITE_FCNTL_WIN32_SET_HANDLE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_WIN32_SET_HANDLE),
/* harmony export */   SQLITE_FCNTL_ZIPVFS: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FCNTL_ZIPVFS),
/* harmony export */   SQLITE_FLOAT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FLOAT),
/* harmony export */   SQLITE_FORMAT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FORMAT),
/* harmony export */   SQLITE_FULL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FULL),
/* harmony export */   SQLITE_FUNCTION: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FUNCTION),
/* harmony export */   SQLITE_IGNORE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IGNORE),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_EQ: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_EQ),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_FUNCTION: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_FUNCTION),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_GE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_GE),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_GLOB: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_GLOB),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_GT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_GT),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_IS: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_IS),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_ISNOT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_ISNOT),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_ISNOTNULL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_ISNOTNULL),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_ISNULL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_ISNULL),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_LE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_LE),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_LIKE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_LIKE),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_LT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_LT),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_MATCH: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_MATCH),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_NE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_NE),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_REGEXP: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_CONSTRAINT_REGEXP),
/* harmony export */   SQLITE_INDEX_SCAN_UNIQUE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INDEX_SCAN_UNIQUE),
/* harmony export */   SQLITE_INNOCUOUS: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INNOCUOUS),
/* harmony export */   SQLITE_INSERT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INSERT),
/* harmony export */   SQLITE_INTEGER: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INTEGER),
/* harmony export */   SQLITE_INTERNAL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INTERNAL),
/* harmony export */   SQLITE_INTERRUPT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INTERRUPT),
/* harmony export */   SQLITE_IOCAP_ATOMIC: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_ATOMIC),
/* harmony export */   SQLITE_IOCAP_ATOMIC16K: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_ATOMIC16K),
/* harmony export */   SQLITE_IOCAP_ATOMIC1K: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_ATOMIC1K),
/* harmony export */   SQLITE_IOCAP_ATOMIC2K: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_ATOMIC2K),
/* harmony export */   SQLITE_IOCAP_ATOMIC32K: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_ATOMIC32K),
/* harmony export */   SQLITE_IOCAP_ATOMIC4K: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_ATOMIC4K),
/* harmony export */   SQLITE_IOCAP_ATOMIC512: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_ATOMIC512),
/* harmony export */   SQLITE_IOCAP_ATOMIC64K: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_ATOMIC64K),
/* harmony export */   SQLITE_IOCAP_ATOMIC8K: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_ATOMIC8K),
/* harmony export */   SQLITE_IOCAP_BATCH_ATOMIC: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_BATCH_ATOMIC),
/* harmony export */   SQLITE_IOCAP_IMMUTABLE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_IMMUTABLE),
/* harmony export */   SQLITE_IOCAP_POWERSAFE_OVERWRITE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_POWERSAFE_OVERWRITE),
/* harmony export */   SQLITE_IOCAP_SAFE_APPEND: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_SAFE_APPEND),
/* harmony export */   SQLITE_IOCAP_SEQUENTIAL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_SEQUENTIAL),
/* harmony export */   SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN),
/* harmony export */   SQLITE_IOERR: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR),
/* harmony export */   SQLITE_IOERR_ACCESS: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_ACCESS),
/* harmony export */   SQLITE_IOERR_BEGIN_ATOMIC: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_BEGIN_ATOMIC),
/* harmony export */   SQLITE_IOERR_CHECKRESERVEDLOCK: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_CHECKRESERVEDLOCK),
/* harmony export */   SQLITE_IOERR_CLOSE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_CLOSE),
/* harmony export */   SQLITE_IOERR_COMMIT_ATOMIC: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_COMMIT_ATOMIC),
/* harmony export */   SQLITE_IOERR_DATA: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_DATA),
/* harmony export */   SQLITE_IOERR_DELETE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_DELETE),
/* harmony export */   SQLITE_IOERR_DELETE_NOENT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_DELETE_NOENT),
/* harmony export */   SQLITE_IOERR_DIR_FSYNC: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_DIR_FSYNC),
/* harmony export */   SQLITE_IOERR_FSTAT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_FSTAT),
/* harmony export */   SQLITE_IOERR_FSYNC: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_FSYNC),
/* harmony export */   SQLITE_IOERR_GETTEMPPATH: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_GETTEMPPATH),
/* harmony export */   SQLITE_IOERR_LOCK: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_LOCK),
/* harmony export */   SQLITE_IOERR_NOMEM: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_NOMEM),
/* harmony export */   SQLITE_IOERR_RDLOCK: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_RDLOCK),
/* harmony export */   SQLITE_IOERR_READ: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_READ),
/* harmony export */   SQLITE_IOERR_ROLLBACK_ATOMIC: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_ROLLBACK_ATOMIC),
/* harmony export */   SQLITE_IOERR_SEEK: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_SEEK),
/* harmony export */   SQLITE_IOERR_SHORT_READ: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_SHORT_READ),
/* harmony export */   SQLITE_IOERR_TRUNCATE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_TRUNCATE),
/* harmony export */   SQLITE_IOERR_UNLOCK: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_UNLOCK),
/* harmony export */   SQLITE_IOERR_VNODE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_VNODE),
/* harmony export */   SQLITE_IOERR_WRITE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_IOERR_WRITE),
/* harmony export */   SQLITE_LIMIT_ATTACHED: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LIMIT_ATTACHED),
/* harmony export */   SQLITE_LIMIT_COLUMN: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LIMIT_COLUMN),
/* harmony export */   SQLITE_LIMIT_COMPOUND_SELECT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LIMIT_COMPOUND_SELECT),
/* harmony export */   SQLITE_LIMIT_EXPR_DEPTH: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LIMIT_EXPR_DEPTH),
/* harmony export */   SQLITE_LIMIT_FUNCTION_ARG: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LIMIT_FUNCTION_ARG),
/* harmony export */   SQLITE_LIMIT_LENGTH: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LIMIT_LENGTH),
/* harmony export */   SQLITE_LIMIT_LIKE_PATTERN_LENGTH: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LIMIT_LIKE_PATTERN_LENGTH),
/* harmony export */   SQLITE_LIMIT_SQL_LENGTH: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LIMIT_SQL_LENGTH),
/* harmony export */   SQLITE_LIMIT_TRIGGER_DEPTH: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LIMIT_TRIGGER_DEPTH),
/* harmony export */   SQLITE_LIMIT_VARIABLE_NUMBER: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LIMIT_VARIABLE_NUMBER),
/* harmony export */   SQLITE_LIMIT_VDBE_OP: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LIMIT_VDBE_OP),
/* harmony export */   SQLITE_LIMIT_WORKER_THREADS: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LIMIT_WORKER_THREADS),
/* harmony export */   SQLITE_LOCKED: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LOCKED),
/* harmony export */   SQLITE_LOCK_EXCLUSIVE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LOCK_EXCLUSIVE),
/* harmony export */   SQLITE_LOCK_NONE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LOCK_NONE),
/* harmony export */   SQLITE_LOCK_PENDING: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LOCK_PENDING),
/* harmony export */   SQLITE_LOCK_RESERVED: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LOCK_RESERVED),
/* harmony export */   SQLITE_LOCK_SHARED: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_LOCK_SHARED),
/* harmony export */   SQLITE_MISMATCH: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_MISMATCH),
/* harmony export */   SQLITE_MISUSE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_MISUSE),
/* harmony export */   SQLITE_NOLFS: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_NOLFS),
/* harmony export */   SQLITE_NOMEM: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_NOMEM),
/* harmony export */   SQLITE_NOTADB: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_NOTADB),
/* harmony export */   SQLITE_NOTFOUND: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_NOTFOUND),
/* harmony export */   SQLITE_NOTICE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_NOTICE),
/* harmony export */   SQLITE_NULL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_NULL),
/* harmony export */   SQLITE_OK: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK),
/* harmony export */   SQLITE_OPEN_AUTOPROXY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_AUTOPROXY),
/* harmony export */   SQLITE_OPEN_CREATE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_CREATE),
/* harmony export */   SQLITE_OPEN_DELETEONCLOSE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_DELETEONCLOSE),
/* harmony export */   SQLITE_OPEN_EXCLUSIVE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_EXCLUSIVE),
/* harmony export */   SQLITE_OPEN_FULLMUTEX: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_FULLMUTEX),
/* harmony export */   SQLITE_OPEN_MAIN_DB: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_MAIN_DB),
/* harmony export */   SQLITE_OPEN_MAIN_JOURNAL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_MAIN_JOURNAL),
/* harmony export */   SQLITE_OPEN_MEMORY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_MEMORY),
/* harmony export */   SQLITE_OPEN_NOFOLLOW: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_NOFOLLOW),
/* harmony export */   SQLITE_OPEN_NOMUTEX: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_NOMUTEX),
/* harmony export */   SQLITE_OPEN_PRIVATECACHE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_PRIVATECACHE),
/* harmony export */   SQLITE_OPEN_READONLY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_READONLY),
/* harmony export */   SQLITE_OPEN_READWRITE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_READWRITE),
/* harmony export */   SQLITE_OPEN_SHAREDCACHE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_SHAREDCACHE),
/* harmony export */   SQLITE_OPEN_SUBJOURNAL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_SUBJOURNAL),
/* harmony export */   SQLITE_OPEN_SUPER_JOURNAL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_SUPER_JOURNAL),
/* harmony export */   SQLITE_OPEN_TEMP_DB: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_TEMP_DB),
/* harmony export */   SQLITE_OPEN_TEMP_JOURNAL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_TEMP_JOURNAL),
/* harmony export */   SQLITE_OPEN_TRANSIENT_DB: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_TRANSIENT_DB),
/* harmony export */   SQLITE_OPEN_URI: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_URI),
/* harmony export */   SQLITE_OPEN_WAL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_WAL),
/* harmony export */   SQLITE_PERM: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_PERM),
/* harmony export */   SQLITE_PRAGMA: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_PRAGMA),
/* harmony export */   SQLITE_PREPARE_NORMALIZED: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_PREPARE_NORMALIZED),
/* harmony export */   SQLITE_PREPARE_NO_VTAB: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_PREPARE_NO_VTAB),
/* harmony export */   SQLITE_PREPARE_PERSISTENT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_PREPARE_PERSISTENT),
/* harmony export */   SQLITE_PROTOCOL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_PROTOCOL),
/* harmony export */   SQLITE_RANGE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_RANGE),
/* harmony export */   SQLITE_READ: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_READ),
/* harmony export */   SQLITE_READONLY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_READONLY),
/* harmony export */   SQLITE_RECURSIVE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_RECURSIVE),
/* harmony export */   SQLITE_REINDEX: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_REINDEX),
/* harmony export */   SQLITE_ROW: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_ROW),
/* harmony export */   SQLITE_SAVEPOINT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_SAVEPOINT),
/* harmony export */   SQLITE_SCHEMA: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_SCHEMA),
/* harmony export */   SQLITE_SELECT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_SELECT),
/* harmony export */   SQLITE_STATIC: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_STATIC),
/* harmony export */   SQLITE_SUBTYPE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_SUBTYPE),
/* harmony export */   SQLITE_SYNC_DATAONLY: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_SYNC_DATAONLY),
/* harmony export */   SQLITE_SYNC_FULL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_SYNC_FULL),
/* harmony export */   SQLITE_SYNC_NORMAL: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_SYNC_NORMAL),
/* harmony export */   SQLITE_TEXT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_TEXT),
/* harmony export */   SQLITE_TOOBIG: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_TOOBIG),
/* harmony export */   SQLITE_TRANSACTION: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_TRANSACTION),
/* harmony export */   SQLITE_TRANSIENT: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_TRANSIENT),
/* harmony export */   SQLITE_UPDATE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_UPDATE),
/* harmony export */   SQLITE_UTF16: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_UTF16),
/* harmony export */   SQLITE_UTF16BE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_UTF16BE),
/* harmony export */   SQLITE_UTF16LE: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_UTF16LE),
/* harmony export */   SQLITE_UTF8: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_UTF8),
/* harmony export */   SQLITE_WARNING: () => (/* reexport safe */ _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_WARNING),
/* harmony export */   SQLiteError: () => (/* binding */ SQLiteError)
/* harmony export */ });
/* harmony import */ var _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./sqlite-constants.js */ "../../node_modules/@journeyapps/wa-sqlite/src/sqlite-constants.js");
// Copyright 2021 Roy T. Hashimoto. All Rights Reserved.




/**
 * Need to have a serializer for bigint
 * https://github.com/GoogleChromeLabs/jsbi/issues/30
 */
if (typeof BigInt.prototype['toJSON'] == 'undefined') {
  BigInt.prototype['toJSON'] = function() {
    return this.toString();
  };
}

const MAX_INT64 = 0x7fffffffffffffffn;
const MIN_INT64 = -0x8000000000000000n;

const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

class SQLiteError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const async = true;


/**
 * Builds a Javascript API from the Emscripten module. This API is still
 * low-level and closely corresponds to the C API exported by the module,
 * but differs in some specifics like throwing exceptions on errors.
 * @param {*} Module SQLite Emscripten module
 * @returns {SQLiteAPI}
 */
function Factory(Module) {
  /** @type {SQLiteAPI} */ const sqlite3 = {};

  Module.retryOps = [];
  const sqliteFreeAddress = Module._getSqliteFree();

  // Allocate some space for 32-bit returned values.
  const tmp = Module._malloc(8);
  const tmpPtr = [tmp, tmp + 4];

  const textEncoder = new TextEncoder();
  // Convert a JS string to a C string. sqlite3_malloc is used to allocate
  // memory (use sqlite3_free to deallocate).
  function createUTF8(s) {
    if (typeof s !== 'string') return 0;
    const utf8 = textEncoder.encode(s);
    const zts = Module._sqlite3_malloc(utf8.byteLength + 1);
    Module.HEAPU8.set(utf8, zts);
    Module.HEAPU8[zts + utf8.byteLength] = 0;
    return zts;
  }

  /**
   * Concatenate 32-bit numbers into a 64-bit (signed) BigInt.
   * @param {number} lo32
   * @param {number} hi32
   * @returns {bigint}
   */
  function cvt32x2ToBigInt(lo32, hi32) {
    return (BigInt(hi32) << 32n) | (BigInt(lo32) & 0xffffffffn);
  }

  // /**
  //  * Setup table change update callback
  //  */
  // var onTableChangedFunctionPointer = Module.addFunction(onTableUpdate);
  // var passFnPointer = Module.cwrap('passFnPointer', 'undefined', ['number']);
  // passFnPointer(onTableChangedFunctionPointer);
  /**
   * Concatenate 32-bit numbers and return as number or BigInt, depending
   * on the value.
   * @param {number} lo32
   * @param {number} hi32
   * @returns {number|bigint}
   */
  const cvt32x2AsSafe = (function() {
    const hiMax = BigInt(Number.MAX_SAFE_INTEGER) >> 32n;
    const hiMin = BigInt(Number.MIN_SAFE_INTEGER) >> 32n;

    return function(lo32, hi32) {
      if (hi32 > hiMax || hi32 < hiMin) {
        // Can't be expressed as a Number so use BigInt.
        return cvt32x2ToBigInt(lo32, hi32);
      } else {
        // Combine the upper and lower 32-bit numbers. The complication is
        // that lo32 is a signed integer which makes manipulating its bits
        // a little tricky - the sign bit gets handled separately.
        return hi32 * 0x100000000 + (lo32 & 0x7fffffff) - (lo32 & 0x80000000);
      }
    };
  })();

  const databases = new Set();
  function verifyDatabase(db) {
    if (!databases.has(db)) {
      throw new SQLiteError('not a database', _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_MISUSE);
    }
  }

  const mapStmtToDB = new Map();
  function verifyStatement(stmt) {
    if (!mapStmtToDB.has(stmt)) {
      throw new SQLiteError('not a statement', _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_MISUSE);
    }
  }

  sqlite3.bind_collection = function(stmt, bindings) {
    verifyStatement(stmt);
    const isArray = Array.isArray(bindings);
    const nBindings = sqlite3.bind_parameter_count(stmt);
    for (let i = 1; i <= nBindings; ++i) {
      const key = isArray ? i - 1 : sqlite3.bind_parameter_name(stmt, i);
      const value = bindings[key];
      if (value !== undefined) {
        sqlite3.bind(stmt, i, value);
      }
    }
    return _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  };

  sqlite3.bind = function(stmt, i, value) {
    verifyStatement(stmt);
    switch (typeof value) {
      case 'number':
        if (value === (value | 0)) {
          return sqlite3.bind_int(stmt, i, value);
        } else {
          return sqlite3.bind_double(stmt, i, value);
        }
      case 'string':
        return sqlite3.bind_text(stmt, i, value);
      case "boolean":
        return sqlite3.bind_int(stmt, i, value ? 1 : 0);
      default:
        if (value instanceof Uint8Array || Array.isArray(value)) {
          return sqlite3.bind_blob(stmt, i, value);
        } else if (value === null) {
          return sqlite3.bind_null(stmt, i);
        } else if (typeof value === 'bigint') {
          return sqlite3.bind_int64(stmt, i, value);
        } else if (value === undefined) {
          // Existing binding (or NULL) will be used.
          return _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_NOTICE;
        } else {
          console.warn('unknown binding converted to null', value);
          return sqlite3.bind_null(stmt, i);
        }
    }
  };

  sqlite3.bind_blob = (function() {
    const fname = 'sqlite3_bind_blob';
    const f = Module.cwrap(fname, ...decl('nnnnn:n'));
    return function(stmt, i, value) {
      verifyStatement(stmt);
      // @ts-ignore
      const byteLength = value.byteLength ?? value.length;
      const ptr = Module._sqlite3_malloc(byteLength);
      Module.HEAPU8.subarray(ptr).set(value);
      const result = f(stmt, i, ptr, byteLength, sqliteFreeAddress);
      return check(fname, result, mapStmtToDB.get(stmt));
    };
  })();

  sqlite3.bind_parameter_count = (function() {
    const fname = 'sqlite3_bind_parameter_count';
    const f = Module.cwrap(fname, ...decl('n:n'));
    return function(stmt) {
      verifyStatement(stmt);
      const result = f(stmt);
      return result;
    };
  })();

  sqlite3.bind_double = (function() {
    const fname = 'sqlite3_bind_double';
    const f = Module.cwrap(fname, ...decl('nnn:n'));
    return function(stmt, i, value) {
      verifyStatement(stmt);
      const result = f(stmt, i, value);
      return check(fname, result, mapStmtToDB.get(stmt));
    };
  })();

  sqlite3.bind_int = (function() {
    const fname = 'sqlite3_bind_int';
    const f = Module.cwrap(fname, ...decl('nnn:n'));
    return function(stmt, i, value) {
      verifyStatement(stmt);
      if (value > 0x7fffffff || value < -0x80000000) return _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_RANGE;

      const result = f(stmt, i, value);
      return check(fname, result, mapStmtToDB.get(stmt));
    };
  })();

  sqlite3.bind_int64 = (function() {
    const fname = 'sqlite3_bind_int64';
    const f = Module.cwrap(fname, ...decl('nnnn:n'));
    return function(stmt, i, value) {
      verifyStatement(stmt);
      if (value > MAX_INT64 || value < MIN_INT64) return _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_RANGE;

      const lo32 = value & 0xffffffffn;
      const hi32 = value >> 32n;
      const result = f(stmt, i, Number(lo32), Number(hi32));
      return check(fname, result, mapStmtToDB.get(stmt));
    };
  })();

  sqlite3.bind_null = (function() {
    const fname = 'sqlite3_bind_null';
    const f = Module.cwrap(fname, ...decl('nn:n'));
    return function(stmt, i) {
      verifyStatement(stmt);
      const result = f(stmt, i);
      return check(fname, result, mapStmtToDB.get(stmt));
    };
  })();

  sqlite3.bind_parameter_name = (function() {
    const fname = 'sqlite3_bind_parameter_name';
    const f = Module.cwrap(fname, ...decl('n:s'));
    return function(stmt, i) {
      verifyStatement(stmt);
      const result = f(stmt, i);
      return result;
    };
  })();

  sqlite3.bind_text = (function() {
    const fname = 'sqlite3_bind_text';
    const f = Module.cwrap(fname, ...decl('nnnnn:n'));
    return function(stmt, i, value) {
      verifyStatement(stmt);
      const ptr = createUTF8(value);
      const result = f(stmt, i, ptr, -1, sqliteFreeAddress);
      return check(fname, result, mapStmtToDB.get(stmt));
    };
  })();

  sqlite3.changes = (function() {
    const fname = 'sqlite3_changes';
    const f = Module.cwrap(fname, ...decl('n:n'));
    return function(db) {
      verifyDatabase(db);
      const result = f(db);
      return result;
    };
  })();

  sqlite3.clear_bindings = (function() {
    const fname = 'sqlite3_clear_bindings';
    const f = Module.cwrap(fname, ...decl('n:n'));
    return function(stmt) {
      verifyStatement(stmt);
      const result = f(stmt);
      return check(fname, result, mapStmtToDB.get(stmt));
    };
  })();

  sqlite3.last_insert_id = (function() {
    const fname = 'sqlite3_last_insert_rowid';
    const f = Module.cwrap(fname, ...decl('n:n'));
    return function(db) {
      verifyDatabase(db);
      const result = f(db);
      // trace(fname, result);
      return result;
    };
  })();
  
  sqlite3.close = (function() {
    const fname = 'sqlite3_close';
    const f = Module.cwrap(fname, ...decl('n:n'), { async });
    return async function(db) {
      verifyDatabase(db);
      const result = await f(db);
      databases.delete(db);
      return check(fname, result, db);
    };
  })();

  sqlite3.column = function(stmt, iCol) {
    verifyStatement(stmt);
    const type = sqlite3.column_type(stmt, iCol);
    switch (type) {
      case _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_BLOB:
        return sqlite3.column_blob(stmt, iCol);
      case _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FLOAT:
        return sqlite3.column_double(stmt, iCol);
      case _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INTEGER:
        const lo32 = sqlite3.column_int(stmt, iCol);
        const hi32 = Module.getTempRet0();
        return cvt32x2AsSafe(lo32, hi32);
      case _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_NULL:
        return null;
      case _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_TEXT:
        return sqlite3.column_text(stmt, iCol);
      default:
        throw new SQLiteError('unknown type', type);
    }
  };

  sqlite3.column_blob = (function() {
    const fname = 'sqlite3_column_blob';
    const f = Module.cwrap(fname, ...decl('nn:n'));
    return function(stmt, iCol) {
      verifyStatement(stmt);
      const nBytes = sqlite3.column_bytes(stmt, iCol);
      const address = f(stmt, iCol);
      const result = Module.HEAPU8.subarray(address, address + nBytes);
      return result;
    };
  })();

  sqlite3.column_bytes = (function() {
    const fname = 'sqlite3_column_bytes';
    const f = Module.cwrap(fname, ...decl('nn:n'));
    return function(stmt, iCol) {
      verifyStatement(stmt);
      const result = f(stmt, iCol);
      return result;
    };
  })();

  sqlite3.column_count = (function() {
    const fname = 'sqlite3_column_count';
    const f = Module.cwrap(fname, ...decl('n:n'));
    return function(stmt) {
      verifyStatement(stmt);
      const result = f(stmt);
      return result;
    };
  })();

  sqlite3.column_double = (function() {
    const fname = 'sqlite3_column_double';
    const f = Module.cwrap(fname, ...decl('nn:n'));
    return function(stmt, iCol) {
      verifyStatement(stmt);
      const result = f(stmt, iCol);
      return result;
    };
  })();

  sqlite3.column_int = (function() {
    // Retrieve int64 but use only the lower 32 bits. The upper 32-bits are
    // accessible with Module.getTempRet0().
    const fname = 'sqlite3_column_int64';
    const f = Module.cwrap(fname, ...decl('nn:n'));
    return function(stmt, iCol) {
      verifyStatement(stmt);
      const result = f(stmt, iCol);
      return result;
    };
  })();

  sqlite3.column_int64 = (function() {
    const fname = 'sqlite3_column_int64';
    const f = Module.cwrap(fname, ...decl('nn:n'));
    return function(stmt, iCol) {
      verifyStatement(stmt);
      const lo32 = f(stmt, iCol);
      const hi32 = Module.getTempRet0();
      const result = cvt32x2ToBigInt(lo32, hi32);
      return result;
    };
  })();

  sqlite3.column_name = (function() {
    const fname = 'sqlite3_column_name';
    const f = Module.cwrap(fname, ...decl('nn:s'));
    return function(stmt, iCol) {
      verifyStatement(stmt);
      const result = f(stmt, iCol);
      return result;
    };
  })();

  sqlite3.column_names = function(stmt) {
    const columns = [];
    const nColumns = sqlite3.column_count(stmt);
    for (let i = 0; i < nColumns; ++i) {
      columns.push(sqlite3.column_name(stmt, i));
    }
    return columns;
  };

  sqlite3.column_text = (function() {
    const fname = 'sqlite3_column_text';
    const f = Module.cwrap(fname, ...decl('nn:s'));
    return function(stmt, iCol) {
      verifyStatement(stmt);
      const result = f(stmt, iCol);
      return result;
    };
  })();

  sqlite3.column_type = (function() {
    const fname = 'sqlite3_column_type';
    const f = Module.cwrap(fname, ...decl('nn:n'));
    return function(stmt, iCol) {
      verifyStatement(stmt);
      const result = f(stmt, iCol);
      return result;
    };
  })();

  sqlite3.create_function = function(db, zFunctionName, nArg, eTextRep, pApp, xFunc, xStep, xFinal) {
    verifyDatabase(db);
    
    // Convert SQLite callback arguments to JavaScript-friendly arguments.
    function adapt(f) {
      return f instanceof AsyncFunction ?
        (async (ctx, n, values) => f(ctx, Module.HEAP32.subarray(values / 4, values / 4 + n))) :
        ((ctx, n, values) => f(ctx, Module.HEAP32.subarray(values / 4, values / 4 + n)));
    }

    const result = Module.create_function(
      db,
      zFunctionName,
      nArg,
      eTextRep,
      pApp,
      xFunc && adapt(xFunc),
      xStep && adapt(xStep),
      xFinal);
    return check('sqlite3_create_function', result, db);
  };

  sqlite3.data_count = (function() {
    const fname = 'sqlite3_data_count';
    const f = Module.cwrap(fname, ...decl('n:n'));
    return function(stmt) {
      verifyStatement(stmt);
      const result = f(stmt);
      return result;
    };
  })();

  sqlite3.exec = async function(db, sql, callback) {
    for await (const stmt of sqlite3.statements(db, sql)) {
      let columns;
      while ((await sqlite3.step(stmt)) === _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_ROW) {
        if (callback) {
          columns = columns ?? sqlite3.column_names(stmt);
          const row = sqlite3.row(stmt);
          await callback(row, columns);
        }
      }
    }
    return _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK;
  };

  sqlite3.finalize = (function() {
    const fname = 'sqlite3_finalize';
    const f = Module.cwrap(fname, ...decl('n:n'), { async });
    return async function(stmt) {
      const result = await f(stmt);
      mapStmtToDB.delete(stmt)

      // Don't throw on error here. Typically the error has already been
      // thrown and finalize() is part of the cleanup.
      return result;
    };
  })();

  sqlite3.get_autocommit = (function() {
    const fname = 'sqlite3_get_autocommit';
    const f = Module.cwrap(fname, ...decl('n:n'));
    return function(db) {
      const result = f(db);
      return result;
    };
  })();

  sqlite3.libversion = (function() {
    const fname = 'sqlite3_libversion';
    const f = Module.cwrap(fname, ...decl(':s'));
    return function() {
      const result = f();
      return result;
    };
  })();

  sqlite3.libversion_number = (function() {
    const fname = 'sqlite3_libversion_number';
    const f = Module.cwrap(fname, ...decl(':n'));
    return function() {
      const result = f();
      return result;
    };
  })();

  sqlite3.limit = (function() {
    const fname = 'sqlite3_limit';
    const f = Module.cwrap(fname, ...decl('nnn:n'));
    return function(db, id, newVal) {
      const result = f(db, id, newVal);
      return result;
    };
  })();

  sqlite3.open_v2 = (function() {
    const fname = 'sqlite3_open_v2';
    const f = Module.cwrap(fname, ...decl('snnn:n'), { async });
    return async function(zFilename, flags, zVfs) {
      flags = flags || _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_CREATE | _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OPEN_READWRITE;
      zVfs = createUTF8(zVfs);
      try {
        // Allow retry operations.
        const rc = await retry(() => f(zFilename, tmpPtr[0], flags, zVfs));

        const db = Module.getValue(tmpPtr[0], '*');
        databases.add(db);

        Module.ccall('RegisterExtensionFunctions', 'number', ['number'], [db]);
        check(fname, rc);
        return db;
      } finally {
        Module._sqlite3_free(zVfs);
      }
    };
  })();

  sqlite3.progress_handler = function(db, nProgressOps, handler, userData) {
    verifyDatabase(db);
    Module.progress_handler(db, nProgressOps, handler, userData);
  };;

  sqlite3.reset = (function() {
    const fname = 'sqlite3_reset';
    const f = Module.cwrap(fname, ...decl('n:n'), { async });
    return async function(stmt) {
      verifyStatement(stmt);
      const result = await f(stmt);
      return check(fname, result, mapStmtToDB.get(stmt));
    };
  })();

  sqlite3.result = function(context, value) {
    switch (typeof value) {
      case 'number':
        if (value === (value | 0)) {
          sqlite3.result_int(context, value);
        } else {
          sqlite3.result_double(context, value);
        }
        break;
      case 'string':
        sqlite3.result_text(context, value);
        break;
      default:
        if (value instanceof Uint8Array || Array.isArray(value)) {
          sqlite3.result_blob(context, value);
        } else if (value === null) {
          sqlite3.result_null(context);
        } else if (typeof value === 'bigint') {
          return sqlite3.result_int64(context, value);
        } else {
          console.warn('unknown result converted to null', value);
          sqlite3.result_null(context);
        }
        break;
    }
  };

  sqlite3.result_blob = (function() {
    const fname = 'sqlite3_result_blob';
    const f = Module.cwrap(fname, ...decl('nnnn:n'));
    return function(context, value) {
      // @ts-ignore
      const byteLength = value.byteLength ?? value.length;
      const ptr = Module._sqlite3_malloc(byteLength);
      Module.HEAPU8.subarray(ptr).set(value);
      f(context, ptr, byteLength, sqliteFreeAddress); // void return
    };
  })();

  sqlite3.result_double = (function() {
    const fname = 'sqlite3_result_double';
    const f = Module.cwrap(fname, ...decl('nn:n'));
    return function(context, value) {
      f(context, value); // void return
    };
  })();

  sqlite3.result_int = (function() {
    const fname = 'sqlite3_result_int';
    const f = Module.cwrap(fname, ...decl('nn:n'));
    return function(context, value) {
      f(context, value); // void return
    };
  })();

  sqlite3.result_int64 = (function() {
    const fname = 'sqlite3_result_int64';
    const f = Module.cwrap(fname, ...decl('nnn:n'));
    return function(context, value) {
      if (value > MAX_INT64 || value < MIN_INT64) return _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_RANGE;

      const lo32 = value & 0xffffffffn;
      const hi32 = value >> 32n;
      f(context, Number(lo32), Number(hi32)); // void return
    };
  })();

  sqlite3.result_null = (function() {
    const fname = 'sqlite3_result_null';
    const f = Module.cwrap(fname, ...decl('n:n'));
    return function(context) {
      f(context); // void return
    };
  })();

  sqlite3.result_text = (function() {
    const fname = 'sqlite3_result_text';
    const f = Module.cwrap(fname, ...decl('nnnn:n'));
    return function(context, value) {
      const ptr = createUTF8(value);
      f(context, ptr, -1, sqliteFreeAddress); // void return
    };
  })();

  sqlite3.row = function(stmt) {
    const row = [];
    const nColumns = sqlite3.data_count(stmt);
    for (let i = 0; i < nColumns; ++i) {
      const value = sqlite3.column(stmt, i);

      // Copy blob if aliasing volatile WebAssembly memory. This avoids an
      // unnecessary copy if users monkey patch column_blob to copy.
      // @ts-ignore
      row.push(value?.buffer === Module.HEAPU8.buffer ? value.slice() : value);
    }
    return row;
  };

  sqlite3.set_authorizer = function(db, xAuth, pApp) {
    verifyDatabase(db);

    // Convert SQLite callback arguments to JavaScript-friendly arguments.
    function cvtArgs(_, iAction, p3, p4, p5, p6) {
      return [
        _,
        iAction,
        Module.UTF8ToString(p3),
        Module.UTF8ToString(p4),
        Module.UTF8ToString(p5),
        Module.UTF8ToString(p6)
      ];
    };
    function adapt(f) {
      return f instanceof AsyncFunction ?
        (async (_, iAction, p3, p4, p5, p6) => f(...cvtArgs(_, iAction, p3, p4, p5, p6))) :
        ((_, iAction, p3, p4, p5, p6) => f(...cvtArgs(_, iAction, p3, p4, p5, p6)));
    }

    const result = Module.set_authorizer(db, adapt(xAuth), pApp);
    return check('sqlite3_set_authorizer', result, db);
  };

  sqlite3.sql = (function() {
    const fname = 'sqlite3_sql';
    const f = Module.cwrap(fname, ...decl('n:s'));
    return function(stmt) {
      verifyStatement(stmt);
      const result = f(stmt);
      return result;
    };
  })();

  sqlite3.statements = function(db, sql, options = {}) {
    const prepare = Module.cwrap(
      'sqlite3_prepare_v3',
      'number',
      ['number', 'number', 'number', 'number', 'number', 'number'],
      { async: true });

    return (async function*() {
      const onFinally = [];
      try {
        // Encode SQL string to UTF-8.
        const utf8 = textEncoder.encode(sql);

        // Copy encoded string to WebAssembly memory. The SQLite docs say
        // zero-termination is a minor optimization so add room for that.
        // Also add space for the statement handle and SQL tail pointer.
        const allocSize = utf8.byteLength - (utf8.byteLength % 4) + 12;
        const pzHead = Module._sqlite3_malloc(allocSize);
        const pzEnd = pzHead + utf8.byteLength + 1;
        onFinally.push(() => Module._sqlite3_free(pzHead));
        Module.HEAPU8.set(utf8, pzHead);
        Module.HEAPU8[pzEnd - 1] = 0;
  
        // Use extra space for the statement handle and SQL tail pointer.
        const pStmt = pzHead + allocSize - 8;
        const pzTail = pzHead + allocSize - 4;

        // Ensure that statement handles are not leaked.
        let stmt;
        function maybeFinalize() {
          if (stmt && !options.unscoped) {
            sqlite3.finalize(stmt);
          }
          stmt = 0;
        }
        onFinally.push(maybeFinalize);
        
        // Loop over statements.
        Module.setValue(pzTail, pzHead, '*');
        do {
          // Reclaim resources for the previous iteration.
          maybeFinalize();

          // Call sqlite3_prepare_v3() for the next statement.
          // Allow retry operations.
          const zTail = Module.getValue(pzTail, '*');
          const rc = await retry(() => {
            return prepare(
              db,
              zTail,
              pzEnd - pzTail,
              options.flags || 0,
              pStmt,
              pzTail);
          });

          if (rc !== _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK) {
            check('sqlite3_prepare_v3', rc, db);
          }
          
          stmt = Module.getValue(pStmt, '*');
          if (stmt) {
            mapStmtToDB.set(stmt, db);
            yield stmt;
          }
        } while (stmt);
      } finally {
        while (onFinally.length) {
          onFinally.pop()();
        }
      }
    })();
  };

  sqlite3.step = (function() {
    const fname = 'sqlite3_step';
    const f = Module.cwrap(fname, ...decl('n:n'), { async });
    return async function(stmt) {
      verifyStatement(stmt);

      // Allow retry operations.
      const rc = await retry(() => f(stmt));

      return check(fname, rc, mapStmtToDB.get(stmt), [_sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_ROW, _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DONE]);
    };
  })();

  sqlite3.commit_hook = function(db, xCommitHook) {
    verifyDatabase(db);
    Module.commit_hook(db, xCommitHook);
  };

  sqlite3.update_hook = function(db, xUpdateHook) {
    verifyDatabase(db);

    // Convert SQLite callback arguments to JavaScript-friendly arguments.
    function cvtArgs(iUpdateType, dbName, tblName, lo32, hi32) {
      return [
        iUpdateType,
        Module.UTF8ToString(dbName),
        Module.UTF8ToString(tblName),
		cvt32x2ToBigInt(lo32, hi32)
      ];
    };
    function adapt(f) {
      return f instanceof AsyncFunction ?
        (async (iUpdateType, dbName, tblName, lo32, hi32) => f(...cvtArgs(iUpdateType, dbName, tblName, lo32, hi32))) :
        ((iUpdateType, dbName, tblName, lo32, hi32) => f(...cvtArgs(iUpdateType, dbName, tblName, lo32, hi32)));
    }

    Module.update_hook(db, adapt(xUpdateHook));
  };;

  sqlite3.value = function(pValue) {
    const type = sqlite3.value_type(pValue);
    switch (type) {
      case _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_BLOB:
        return sqlite3.value_blob(pValue);
      case _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_FLOAT:
        return sqlite3.value_double(pValue);
      case _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_INTEGER:
        const lo32 = sqlite3.value_int(pValue);
        const hi32 = Module.getTempRet0();
        return cvt32x2AsSafe(lo32, hi32);
      case _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_NULL:
        return null;
      case _sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_TEXT:
        return sqlite3.value_text(pValue);
      default:
        throw new SQLiteError('unknown type', type);
    }
  };

  sqlite3.value_blob = (function() {
    const fname = 'sqlite3_value_blob';
    const f = Module.cwrap(fname, ...decl('n:n'));
    return function(pValue) {
      const nBytes = sqlite3.value_bytes(pValue);
      const address = f(pValue);
      const result = Module.HEAPU8.subarray(address, address + nBytes);
      return result;
    };
  })();

  sqlite3.value_bytes = (function() {
    const fname = 'sqlite3_value_bytes';
    const f = Module.cwrap(fname, ...decl('n:n'));
    return function(pValue) {
      const result = f(pValue);
      return result;
    };
  })();

  sqlite3.value_double = (function() {
    const fname = 'sqlite3_value_double';
    const f = Module.cwrap(fname, ...decl('n:n'));
    return function(pValue) {
      const result = f(pValue);
      return result;
    };
  })();

  sqlite3.value_int = (function() {
    const fname = 'sqlite3_value_int64';
    const f = Module.cwrap(fname, ...decl('n:n'));
    return function(pValue) {
      const result = f(pValue);
      return result;
    };
  })();

  sqlite3.value_int64 = (function() {
    const fname = 'sqlite3_value_int64';
    const f = Module.cwrap(fname, ...decl('n:n'));
    return function(pValue) {
      const lo32 = f(pValue);
      const hi32 = Module.getTempRet0();
      const result = cvt32x2ToBigInt(lo32, hi32);
      return result;
    };
  })();

  sqlite3.value_text = (function() {
    const fname = 'sqlite3_value_text';
    const f = Module.cwrap(fname, ...decl('n:s'));
    return function(pValue) {
      const result = f(pValue);
      return result;
    };
  })();

  sqlite3.value_type = (function() {
    const fname = 'sqlite3_value_type';
    const f = Module.cwrap(fname, ...decl('n:n'));
    return function(pValue) {
      const result = f(pValue);
      return result;
    };
  })();

  sqlite3.vfs_register = function(vfs, makeDefault) {
    const result = Module.vfs_register(vfs, makeDefault);
    return check('sqlite3_vfs_register', result);
  };

  function check(fname, result, db = null, allowed = [_sqlite_constants_js__WEBPACK_IMPORTED_MODULE_0__.SQLITE_OK]) {
    if (allowed.includes(result)) return result;
    const message = db ? Module.ccall('sqlite3_errmsg', 'string', ['number'], [db]) : fname;
    throw new SQLiteError(message, result);
  }

  // This function is used to automatically retry failed calls that
  // have pending retry operations that should allow the retry to
  // succeed.
  async function retry(f) {
    let rc;
    do {
      // Wait for all pending retry operations to complete. This is
      // normally empty on the first loop iteration.
      if (Module.retryOps.length) {
        try {
          await Promise.all(Module.retryOps);
        } finally {
          Module.retryOps = [];
        }
      }
      
      rc = await f();

      // Retry on failure with new pending retry operations.
    } while (rc && Module.retryOps.length);
    return rc;
  }

  return sqlite3;
}

// Helper function to use a more compact signature specification.
function decl(s) {
  const result = [];
  const m = s.match(/([ns@]*):([nsv@])/);
  switch (m[2]) {
    case 'n':
      result.push('number');
      break;
    case 's':
      result.push('string');
      break;
    case 'v':
      result.push(null);
      break;
  }

  const args = [];
  for (let c of m[1]) {
    switch (c) {
      case 'n':
        args.push('number');
        break;
      case 's':
        args.push('string');
        break;
    }
  }
  result.push(args);
  return result;
}


/***/ },

/***/ "../../node_modules/@journeyapps/wa-sqlite/src/sqlite-constants.js"
/*!*************************************************************************!*\
  !*** ../../node_modules/@journeyapps/wa-sqlite/src/sqlite-constants.js ***!
  \*************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SQLITE_ABORT: () => (/* binding */ SQLITE_ABORT),
/* harmony export */   SQLITE_ACCESS_EXISTS: () => (/* binding */ SQLITE_ACCESS_EXISTS),
/* harmony export */   SQLITE_ACCESS_READ: () => (/* binding */ SQLITE_ACCESS_READ),
/* harmony export */   SQLITE_ACCESS_READWRITE: () => (/* binding */ SQLITE_ACCESS_READWRITE),
/* harmony export */   SQLITE_ALTER_TABLE: () => (/* binding */ SQLITE_ALTER_TABLE),
/* harmony export */   SQLITE_ANALYZE: () => (/* binding */ SQLITE_ANALYZE),
/* harmony export */   SQLITE_ATTACH: () => (/* binding */ SQLITE_ATTACH),
/* harmony export */   SQLITE_AUTH: () => (/* binding */ SQLITE_AUTH),
/* harmony export */   SQLITE_BLOB: () => (/* binding */ SQLITE_BLOB),
/* harmony export */   SQLITE_BUSY: () => (/* binding */ SQLITE_BUSY),
/* harmony export */   SQLITE_CANTOPEN: () => (/* binding */ SQLITE_CANTOPEN),
/* harmony export */   SQLITE_CONSTRAINT: () => (/* binding */ SQLITE_CONSTRAINT),
/* harmony export */   SQLITE_CONSTRAINT_CHECK: () => (/* binding */ SQLITE_CONSTRAINT_CHECK),
/* harmony export */   SQLITE_CONSTRAINT_COMMITHOOK: () => (/* binding */ SQLITE_CONSTRAINT_COMMITHOOK),
/* harmony export */   SQLITE_CONSTRAINT_FOREIGNKEY: () => (/* binding */ SQLITE_CONSTRAINT_FOREIGNKEY),
/* harmony export */   SQLITE_CONSTRAINT_FUNCTION: () => (/* binding */ SQLITE_CONSTRAINT_FUNCTION),
/* harmony export */   SQLITE_CONSTRAINT_NOTNULL: () => (/* binding */ SQLITE_CONSTRAINT_NOTNULL),
/* harmony export */   SQLITE_CONSTRAINT_PINNED: () => (/* binding */ SQLITE_CONSTRAINT_PINNED),
/* harmony export */   SQLITE_CONSTRAINT_PRIMARYKEY: () => (/* binding */ SQLITE_CONSTRAINT_PRIMARYKEY),
/* harmony export */   SQLITE_CONSTRAINT_ROWID: () => (/* binding */ SQLITE_CONSTRAINT_ROWID),
/* harmony export */   SQLITE_CONSTRAINT_TRIGGER: () => (/* binding */ SQLITE_CONSTRAINT_TRIGGER),
/* harmony export */   SQLITE_CONSTRAINT_UNIQUE: () => (/* binding */ SQLITE_CONSTRAINT_UNIQUE),
/* harmony export */   SQLITE_CONSTRAINT_VTAB: () => (/* binding */ SQLITE_CONSTRAINT_VTAB),
/* harmony export */   SQLITE_COPY: () => (/* binding */ SQLITE_COPY),
/* harmony export */   SQLITE_CORRUPT: () => (/* binding */ SQLITE_CORRUPT),
/* harmony export */   SQLITE_CREATE_INDEX: () => (/* binding */ SQLITE_CREATE_INDEX),
/* harmony export */   SQLITE_CREATE_TABLE: () => (/* binding */ SQLITE_CREATE_TABLE),
/* harmony export */   SQLITE_CREATE_TEMP_INDEX: () => (/* binding */ SQLITE_CREATE_TEMP_INDEX),
/* harmony export */   SQLITE_CREATE_TEMP_TABLE: () => (/* binding */ SQLITE_CREATE_TEMP_TABLE),
/* harmony export */   SQLITE_CREATE_TEMP_TRIGGER: () => (/* binding */ SQLITE_CREATE_TEMP_TRIGGER),
/* harmony export */   SQLITE_CREATE_TEMP_VIEW: () => (/* binding */ SQLITE_CREATE_TEMP_VIEW),
/* harmony export */   SQLITE_CREATE_TRIGGER: () => (/* binding */ SQLITE_CREATE_TRIGGER),
/* harmony export */   SQLITE_CREATE_VIEW: () => (/* binding */ SQLITE_CREATE_VIEW),
/* harmony export */   SQLITE_CREATE_VTABLE: () => (/* binding */ SQLITE_CREATE_VTABLE),
/* harmony export */   SQLITE_DELETE: () => (/* binding */ SQLITE_DELETE),
/* harmony export */   SQLITE_DENY: () => (/* binding */ SQLITE_DENY),
/* harmony export */   SQLITE_DETACH: () => (/* binding */ SQLITE_DETACH),
/* harmony export */   SQLITE_DETERMINISTIC: () => (/* binding */ SQLITE_DETERMINISTIC),
/* harmony export */   SQLITE_DIRECTONLY: () => (/* binding */ SQLITE_DIRECTONLY),
/* harmony export */   SQLITE_DONE: () => (/* binding */ SQLITE_DONE),
/* harmony export */   SQLITE_DROP_INDEX: () => (/* binding */ SQLITE_DROP_INDEX),
/* harmony export */   SQLITE_DROP_TABLE: () => (/* binding */ SQLITE_DROP_TABLE),
/* harmony export */   SQLITE_DROP_TEMP_INDEX: () => (/* binding */ SQLITE_DROP_TEMP_INDEX),
/* harmony export */   SQLITE_DROP_TEMP_TABLE: () => (/* binding */ SQLITE_DROP_TEMP_TABLE),
/* harmony export */   SQLITE_DROP_TEMP_TRIGGER: () => (/* binding */ SQLITE_DROP_TEMP_TRIGGER),
/* harmony export */   SQLITE_DROP_TEMP_VIEW: () => (/* binding */ SQLITE_DROP_TEMP_VIEW),
/* harmony export */   SQLITE_DROP_TRIGGER: () => (/* binding */ SQLITE_DROP_TRIGGER),
/* harmony export */   SQLITE_DROP_VIEW: () => (/* binding */ SQLITE_DROP_VIEW),
/* harmony export */   SQLITE_DROP_VTABLE: () => (/* binding */ SQLITE_DROP_VTABLE),
/* harmony export */   SQLITE_EMPTY: () => (/* binding */ SQLITE_EMPTY),
/* harmony export */   SQLITE_ERROR: () => (/* binding */ SQLITE_ERROR),
/* harmony export */   SQLITE_FCNTL_BEGIN_ATOMIC_WRITE: () => (/* binding */ SQLITE_FCNTL_BEGIN_ATOMIC_WRITE),
/* harmony export */   SQLITE_FCNTL_BUSYHANDLER: () => (/* binding */ SQLITE_FCNTL_BUSYHANDLER),
/* harmony export */   SQLITE_FCNTL_CHUNK_SIZE: () => (/* binding */ SQLITE_FCNTL_CHUNK_SIZE),
/* harmony export */   SQLITE_FCNTL_CKPT_DONE: () => (/* binding */ SQLITE_FCNTL_CKPT_DONE),
/* harmony export */   SQLITE_FCNTL_CKPT_START: () => (/* binding */ SQLITE_FCNTL_CKPT_START),
/* harmony export */   SQLITE_FCNTL_COMMIT_ATOMIC_WRITE: () => (/* binding */ SQLITE_FCNTL_COMMIT_ATOMIC_WRITE),
/* harmony export */   SQLITE_FCNTL_COMMIT_PHASETWO: () => (/* binding */ SQLITE_FCNTL_COMMIT_PHASETWO),
/* harmony export */   SQLITE_FCNTL_DATA_VERSION: () => (/* binding */ SQLITE_FCNTL_DATA_VERSION),
/* harmony export */   SQLITE_FCNTL_FILE_POINTER: () => (/* binding */ SQLITE_FCNTL_FILE_POINTER),
/* harmony export */   SQLITE_FCNTL_GET_LOCKPROXYFILE: () => (/* binding */ SQLITE_FCNTL_GET_LOCKPROXYFILE),
/* harmony export */   SQLITE_FCNTL_HAS_MOVED: () => (/* binding */ SQLITE_FCNTL_HAS_MOVED),
/* harmony export */   SQLITE_FCNTL_JOURNAL_POINTER: () => (/* binding */ SQLITE_FCNTL_JOURNAL_POINTER),
/* harmony export */   SQLITE_FCNTL_LAST_ERRNO: () => (/* binding */ SQLITE_FCNTL_LAST_ERRNO),
/* harmony export */   SQLITE_FCNTL_LOCKSTATE: () => (/* binding */ SQLITE_FCNTL_LOCKSTATE),
/* harmony export */   SQLITE_FCNTL_LOCK_TIMEOUT: () => (/* binding */ SQLITE_FCNTL_LOCK_TIMEOUT),
/* harmony export */   SQLITE_FCNTL_MMAP_SIZE: () => (/* binding */ SQLITE_FCNTL_MMAP_SIZE),
/* harmony export */   SQLITE_FCNTL_OVERWRITE: () => (/* binding */ SQLITE_FCNTL_OVERWRITE),
/* harmony export */   SQLITE_FCNTL_PDB: () => (/* binding */ SQLITE_FCNTL_PDB),
/* harmony export */   SQLITE_FCNTL_PERSIST_WAL: () => (/* binding */ SQLITE_FCNTL_PERSIST_WAL),
/* harmony export */   SQLITE_FCNTL_POWERSAFE_OVERWRITE: () => (/* binding */ SQLITE_FCNTL_POWERSAFE_OVERWRITE),
/* harmony export */   SQLITE_FCNTL_PRAGMA: () => (/* binding */ SQLITE_FCNTL_PRAGMA),
/* harmony export */   SQLITE_FCNTL_RBU: () => (/* binding */ SQLITE_FCNTL_RBU),
/* harmony export */   SQLITE_FCNTL_RESERVE_BYTES: () => (/* binding */ SQLITE_FCNTL_RESERVE_BYTES),
/* harmony export */   SQLITE_FCNTL_ROLLBACK_ATOMIC_WRITE: () => (/* binding */ SQLITE_FCNTL_ROLLBACK_ATOMIC_WRITE),
/* harmony export */   SQLITE_FCNTL_SET_LOCKPROXYFILE: () => (/* binding */ SQLITE_FCNTL_SET_LOCKPROXYFILE),
/* harmony export */   SQLITE_FCNTL_SIZE_HINT: () => (/* binding */ SQLITE_FCNTL_SIZE_HINT),
/* harmony export */   SQLITE_FCNTL_SIZE_LIMIT: () => (/* binding */ SQLITE_FCNTL_SIZE_LIMIT),
/* harmony export */   SQLITE_FCNTL_SYNC: () => (/* binding */ SQLITE_FCNTL_SYNC),
/* harmony export */   SQLITE_FCNTL_SYNC_OMITTED: () => (/* binding */ SQLITE_FCNTL_SYNC_OMITTED),
/* harmony export */   SQLITE_FCNTL_TEMPFILENAME: () => (/* binding */ SQLITE_FCNTL_TEMPFILENAME),
/* harmony export */   SQLITE_FCNTL_TRACE: () => (/* binding */ SQLITE_FCNTL_TRACE),
/* harmony export */   SQLITE_FCNTL_VFSNAME: () => (/* binding */ SQLITE_FCNTL_VFSNAME),
/* harmony export */   SQLITE_FCNTL_VFS_POINTER: () => (/* binding */ SQLITE_FCNTL_VFS_POINTER),
/* harmony export */   SQLITE_FCNTL_WAL_BLOCK: () => (/* binding */ SQLITE_FCNTL_WAL_BLOCK),
/* harmony export */   SQLITE_FCNTL_WIN32_AV_RETRY: () => (/* binding */ SQLITE_FCNTL_WIN32_AV_RETRY),
/* harmony export */   SQLITE_FCNTL_WIN32_GET_HANDLE: () => (/* binding */ SQLITE_FCNTL_WIN32_GET_HANDLE),
/* harmony export */   SQLITE_FCNTL_WIN32_SET_HANDLE: () => (/* binding */ SQLITE_FCNTL_WIN32_SET_HANDLE),
/* harmony export */   SQLITE_FCNTL_ZIPVFS: () => (/* binding */ SQLITE_FCNTL_ZIPVFS),
/* harmony export */   SQLITE_FLOAT: () => (/* binding */ SQLITE_FLOAT),
/* harmony export */   SQLITE_FORMAT: () => (/* binding */ SQLITE_FORMAT),
/* harmony export */   SQLITE_FULL: () => (/* binding */ SQLITE_FULL),
/* harmony export */   SQLITE_FUNCTION: () => (/* binding */ SQLITE_FUNCTION),
/* harmony export */   SQLITE_IGNORE: () => (/* binding */ SQLITE_IGNORE),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_EQ: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_EQ),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_FUNCTION: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_FUNCTION),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_GE: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_GE),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_GLOB: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_GLOB),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_GT: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_GT),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_IS: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_IS),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_ISNOT: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_ISNOT),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_ISNOTNULL: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_ISNOTNULL),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_ISNULL: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_ISNULL),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_LE: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_LE),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_LIKE: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_LIKE),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_LT: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_LT),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_MATCH: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_MATCH),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_NE: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_NE),
/* harmony export */   SQLITE_INDEX_CONSTRAINT_REGEXP: () => (/* binding */ SQLITE_INDEX_CONSTRAINT_REGEXP),
/* harmony export */   SQLITE_INDEX_SCAN_UNIQUE: () => (/* binding */ SQLITE_INDEX_SCAN_UNIQUE),
/* harmony export */   SQLITE_INNOCUOUS: () => (/* binding */ SQLITE_INNOCUOUS),
/* harmony export */   SQLITE_INSERT: () => (/* binding */ SQLITE_INSERT),
/* harmony export */   SQLITE_INTEGER: () => (/* binding */ SQLITE_INTEGER),
/* harmony export */   SQLITE_INTERNAL: () => (/* binding */ SQLITE_INTERNAL),
/* harmony export */   SQLITE_INTERRUPT: () => (/* binding */ SQLITE_INTERRUPT),
/* harmony export */   SQLITE_IOCAP_ATOMIC: () => (/* binding */ SQLITE_IOCAP_ATOMIC),
/* harmony export */   SQLITE_IOCAP_ATOMIC16K: () => (/* binding */ SQLITE_IOCAP_ATOMIC16K),
/* harmony export */   SQLITE_IOCAP_ATOMIC1K: () => (/* binding */ SQLITE_IOCAP_ATOMIC1K),
/* harmony export */   SQLITE_IOCAP_ATOMIC2K: () => (/* binding */ SQLITE_IOCAP_ATOMIC2K),
/* harmony export */   SQLITE_IOCAP_ATOMIC32K: () => (/* binding */ SQLITE_IOCAP_ATOMIC32K),
/* harmony export */   SQLITE_IOCAP_ATOMIC4K: () => (/* binding */ SQLITE_IOCAP_ATOMIC4K),
/* harmony export */   SQLITE_IOCAP_ATOMIC512: () => (/* binding */ SQLITE_IOCAP_ATOMIC512),
/* harmony export */   SQLITE_IOCAP_ATOMIC64K: () => (/* binding */ SQLITE_IOCAP_ATOMIC64K),
/* harmony export */   SQLITE_IOCAP_ATOMIC8K: () => (/* binding */ SQLITE_IOCAP_ATOMIC8K),
/* harmony export */   SQLITE_IOCAP_BATCH_ATOMIC: () => (/* binding */ SQLITE_IOCAP_BATCH_ATOMIC),
/* harmony export */   SQLITE_IOCAP_IMMUTABLE: () => (/* binding */ SQLITE_IOCAP_IMMUTABLE),
/* harmony export */   SQLITE_IOCAP_POWERSAFE_OVERWRITE: () => (/* binding */ SQLITE_IOCAP_POWERSAFE_OVERWRITE),
/* harmony export */   SQLITE_IOCAP_SAFE_APPEND: () => (/* binding */ SQLITE_IOCAP_SAFE_APPEND),
/* harmony export */   SQLITE_IOCAP_SEQUENTIAL: () => (/* binding */ SQLITE_IOCAP_SEQUENTIAL),
/* harmony export */   SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN: () => (/* binding */ SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN),
/* harmony export */   SQLITE_IOERR: () => (/* binding */ SQLITE_IOERR),
/* harmony export */   SQLITE_IOERR_ACCESS: () => (/* binding */ SQLITE_IOERR_ACCESS),
/* harmony export */   SQLITE_IOERR_BEGIN_ATOMIC: () => (/* binding */ SQLITE_IOERR_BEGIN_ATOMIC),
/* harmony export */   SQLITE_IOERR_CHECKRESERVEDLOCK: () => (/* binding */ SQLITE_IOERR_CHECKRESERVEDLOCK),
/* harmony export */   SQLITE_IOERR_CLOSE: () => (/* binding */ SQLITE_IOERR_CLOSE),
/* harmony export */   SQLITE_IOERR_COMMIT_ATOMIC: () => (/* binding */ SQLITE_IOERR_COMMIT_ATOMIC),
/* harmony export */   SQLITE_IOERR_DATA: () => (/* binding */ SQLITE_IOERR_DATA),
/* harmony export */   SQLITE_IOERR_DELETE: () => (/* binding */ SQLITE_IOERR_DELETE),
/* harmony export */   SQLITE_IOERR_DELETE_NOENT: () => (/* binding */ SQLITE_IOERR_DELETE_NOENT),
/* harmony export */   SQLITE_IOERR_DIR_FSYNC: () => (/* binding */ SQLITE_IOERR_DIR_FSYNC),
/* harmony export */   SQLITE_IOERR_FSTAT: () => (/* binding */ SQLITE_IOERR_FSTAT),
/* harmony export */   SQLITE_IOERR_FSYNC: () => (/* binding */ SQLITE_IOERR_FSYNC),
/* harmony export */   SQLITE_IOERR_GETTEMPPATH: () => (/* binding */ SQLITE_IOERR_GETTEMPPATH),
/* harmony export */   SQLITE_IOERR_LOCK: () => (/* binding */ SQLITE_IOERR_LOCK),
/* harmony export */   SQLITE_IOERR_NOMEM: () => (/* binding */ SQLITE_IOERR_NOMEM),
/* harmony export */   SQLITE_IOERR_RDLOCK: () => (/* binding */ SQLITE_IOERR_RDLOCK),
/* harmony export */   SQLITE_IOERR_READ: () => (/* binding */ SQLITE_IOERR_READ),
/* harmony export */   SQLITE_IOERR_ROLLBACK_ATOMIC: () => (/* binding */ SQLITE_IOERR_ROLLBACK_ATOMIC),
/* harmony export */   SQLITE_IOERR_SEEK: () => (/* binding */ SQLITE_IOERR_SEEK),
/* harmony export */   SQLITE_IOERR_SHORT_READ: () => (/* binding */ SQLITE_IOERR_SHORT_READ),
/* harmony export */   SQLITE_IOERR_TRUNCATE: () => (/* binding */ SQLITE_IOERR_TRUNCATE),
/* harmony export */   SQLITE_IOERR_UNLOCK: () => (/* binding */ SQLITE_IOERR_UNLOCK),
/* harmony export */   SQLITE_IOERR_VNODE: () => (/* binding */ SQLITE_IOERR_VNODE),
/* harmony export */   SQLITE_IOERR_WRITE: () => (/* binding */ SQLITE_IOERR_WRITE),
/* harmony export */   SQLITE_LIMIT_ATTACHED: () => (/* binding */ SQLITE_LIMIT_ATTACHED),
/* harmony export */   SQLITE_LIMIT_COLUMN: () => (/* binding */ SQLITE_LIMIT_COLUMN),
/* harmony export */   SQLITE_LIMIT_COMPOUND_SELECT: () => (/* binding */ SQLITE_LIMIT_COMPOUND_SELECT),
/* harmony export */   SQLITE_LIMIT_EXPR_DEPTH: () => (/* binding */ SQLITE_LIMIT_EXPR_DEPTH),
/* harmony export */   SQLITE_LIMIT_FUNCTION_ARG: () => (/* binding */ SQLITE_LIMIT_FUNCTION_ARG),
/* harmony export */   SQLITE_LIMIT_LENGTH: () => (/* binding */ SQLITE_LIMIT_LENGTH),
/* harmony export */   SQLITE_LIMIT_LIKE_PATTERN_LENGTH: () => (/* binding */ SQLITE_LIMIT_LIKE_PATTERN_LENGTH),
/* harmony export */   SQLITE_LIMIT_SQL_LENGTH: () => (/* binding */ SQLITE_LIMIT_SQL_LENGTH),
/* harmony export */   SQLITE_LIMIT_TRIGGER_DEPTH: () => (/* binding */ SQLITE_LIMIT_TRIGGER_DEPTH),
/* harmony export */   SQLITE_LIMIT_VARIABLE_NUMBER: () => (/* binding */ SQLITE_LIMIT_VARIABLE_NUMBER),
/* harmony export */   SQLITE_LIMIT_VDBE_OP: () => (/* binding */ SQLITE_LIMIT_VDBE_OP),
/* harmony export */   SQLITE_LIMIT_WORKER_THREADS: () => (/* binding */ SQLITE_LIMIT_WORKER_THREADS),
/* harmony export */   SQLITE_LOCKED: () => (/* binding */ SQLITE_LOCKED),
/* harmony export */   SQLITE_LOCK_EXCLUSIVE: () => (/* binding */ SQLITE_LOCK_EXCLUSIVE),
/* harmony export */   SQLITE_LOCK_NONE: () => (/* binding */ SQLITE_LOCK_NONE),
/* harmony export */   SQLITE_LOCK_PENDING: () => (/* binding */ SQLITE_LOCK_PENDING),
/* harmony export */   SQLITE_LOCK_RESERVED: () => (/* binding */ SQLITE_LOCK_RESERVED),
/* harmony export */   SQLITE_LOCK_SHARED: () => (/* binding */ SQLITE_LOCK_SHARED),
/* harmony export */   SQLITE_MISMATCH: () => (/* binding */ SQLITE_MISMATCH),
/* harmony export */   SQLITE_MISUSE: () => (/* binding */ SQLITE_MISUSE),
/* harmony export */   SQLITE_NOLFS: () => (/* binding */ SQLITE_NOLFS),
/* harmony export */   SQLITE_NOMEM: () => (/* binding */ SQLITE_NOMEM),
/* harmony export */   SQLITE_NOTADB: () => (/* binding */ SQLITE_NOTADB),
/* harmony export */   SQLITE_NOTFOUND: () => (/* binding */ SQLITE_NOTFOUND),
/* harmony export */   SQLITE_NOTICE: () => (/* binding */ SQLITE_NOTICE),
/* harmony export */   SQLITE_NULL: () => (/* binding */ SQLITE_NULL),
/* harmony export */   SQLITE_OK: () => (/* binding */ SQLITE_OK),
/* harmony export */   SQLITE_OPEN_AUTOPROXY: () => (/* binding */ SQLITE_OPEN_AUTOPROXY),
/* harmony export */   SQLITE_OPEN_CREATE: () => (/* binding */ SQLITE_OPEN_CREATE),
/* harmony export */   SQLITE_OPEN_DELETEONCLOSE: () => (/* binding */ SQLITE_OPEN_DELETEONCLOSE),
/* harmony export */   SQLITE_OPEN_EXCLUSIVE: () => (/* binding */ SQLITE_OPEN_EXCLUSIVE),
/* harmony export */   SQLITE_OPEN_FULLMUTEX: () => (/* binding */ SQLITE_OPEN_FULLMUTEX),
/* harmony export */   SQLITE_OPEN_MAIN_DB: () => (/* binding */ SQLITE_OPEN_MAIN_DB),
/* harmony export */   SQLITE_OPEN_MAIN_JOURNAL: () => (/* binding */ SQLITE_OPEN_MAIN_JOURNAL),
/* harmony export */   SQLITE_OPEN_MEMORY: () => (/* binding */ SQLITE_OPEN_MEMORY),
/* harmony export */   SQLITE_OPEN_NOFOLLOW: () => (/* binding */ SQLITE_OPEN_NOFOLLOW),
/* harmony export */   SQLITE_OPEN_NOMUTEX: () => (/* binding */ SQLITE_OPEN_NOMUTEX),
/* harmony export */   SQLITE_OPEN_PRIVATECACHE: () => (/* binding */ SQLITE_OPEN_PRIVATECACHE),
/* harmony export */   SQLITE_OPEN_READONLY: () => (/* binding */ SQLITE_OPEN_READONLY),
/* harmony export */   SQLITE_OPEN_READWRITE: () => (/* binding */ SQLITE_OPEN_READWRITE),
/* harmony export */   SQLITE_OPEN_SHAREDCACHE: () => (/* binding */ SQLITE_OPEN_SHAREDCACHE),
/* harmony export */   SQLITE_OPEN_SUBJOURNAL: () => (/* binding */ SQLITE_OPEN_SUBJOURNAL),
/* harmony export */   SQLITE_OPEN_SUPER_JOURNAL: () => (/* binding */ SQLITE_OPEN_SUPER_JOURNAL),
/* harmony export */   SQLITE_OPEN_TEMP_DB: () => (/* binding */ SQLITE_OPEN_TEMP_DB),
/* harmony export */   SQLITE_OPEN_TEMP_JOURNAL: () => (/* binding */ SQLITE_OPEN_TEMP_JOURNAL),
/* harmony export */   SQLITE_OPEN_TRANSIENT_DB: () => (/* binding */ SQLITE_OPEN_TRANSIENT_DB),
/* harmony export */   SQLITE_OPEN_URI: () => (/* binding */ SQLITE_OPEN_URI),
/* harmony export */   SQLITE_OPEN_WAL: () => (/* binding */ SQLITE_OPEN_WAL),
/* harmony export */   SQLITE_PERM: () => (/* binding */ SQLITE_PERM),
/* harmony export */   SQLITE_PRAGMA: () => (/* binding */ SQLITE_PRAGMA),
/* harmony export */   SQLITE_PREPARE_NORMALIZED: () => (/* binding */ SQLITE_PREPARE_NORMALIZED),
/* harmony export */   SQLITE_PREPARE_NO_VTAB: () => (/* binding */ SQLITE_PREPARE_NO_VTAB),
/* harmony export */   SQLITE_PREPARE_PERSISTENT: () => (/* binding */ SQLITE_PREPARE_PERSISTENT),
/* harmony export */   SQLITE_PROTOCOL: () => (/* binding */ SQLITE_PROTOCOL),
/* harmony export */   SQLITE_RANGE: () => (/* binding */ SQLITE_RANGE),
/* harmony export */   SQLITE_READ: () => (/* binding */ SQLITE_READ),
/* harmony export */   SQLITE_READONLY: () => (/* binding */ SQLITE_READONLY),
/* harmony export */   SQLITE_RECURSIVE: () => (/* binding */ SQLITE_RECURSIVE),
/* harmony export */   SQLITE_REINDEX: () => (/* binding */ SQLITE_REINDEX),
/* harmony export */   SQLITE_ROW: () => (/* binding */ SQLITE_ROW),
/* harmony export */   SQLITE_SAVEPOINT: () => (/* binding */ SQLITE_SAVEPOINT),
/* harmony export */   SQLITE_SCHEMA: () => (/* binding */ SQLITE_SCHEMA),
/* harmony export */   SQLITE_SELECT: () => (/* binding */ SQLITE_SELECT),
/* harmony export */   SQLITE_STATIC: () => (/* binding */ SQLITE_STATIC),
/* harmony export */   SQLITE_SUBTYPE: () => (/* binding */ SQLITE_SUBTYPE),
/* harmony export */   SQLITE_SYNC_DATAONLY: () => (/* binding */ SQLITE_SYNC_DATAONLY),
/* harmony export */   SQLITE_SYNC_FULL: () => (/* binding */ SQLITE_SYNC_FULL),
/* harmony export */   SQLITE_SYNC_NORMAL: () => (/* binding */ SQLITE_SYNC_NORMAL),
/* harmony export */   SQLITE_TEXT: () => (/* binding */ SQLITE_TEXT),
/* harmony export */   SQLITE_TOOBIG: () => (/* binding */ SQLITE_TOOBIG),
/* harmony export */   SQLITE_TRANSACTION: () => (/* binding */ SQLITE_TRANSACTION),
/* harmony export */   SQLITE_TRANSIENT: () => (/* binding */ SQLITE_TRANSIENT),
/* harmony export */   SQLITE_UPDATE: () => (/* binding */ SQLITE_UPDATE),
/* harmony export */   SQLITE_UTF16: () => (/* binding */ SQLITE_UTF16),
/* harmony export */   SQLITE_UTF16BE: () => (/* binding */ SQLITE_UTF16BE),
/* harmony export */   SQLITE_UTF16LE: () => (/* binding */ SQLITE_UTF16LE),
/* harmony export */   SQLITE_UTF8: () => (/* binding */ SQLITE_UTF8),
/* harmony export */   SQLITE_WARNING: () => (/* binding */ SQLITE_WARNING)
/* harmony export */ });
// Primary result codes.
// https://www.sqlite.org/rescode.html
const SQLITE_OK = 0;
const SQLITE_ERROR = 1;
const SQLITE_INTERNAL = 2;
const SQLITE_PERM = 3;
const SQLITE_ABORT = 4;
const SQLITE_BUSY = 5;
const SQLITE_LOCKED = 6;
const SQLITE_NOMEM = 7;
const SQLITE_READONLY = 8;
const SQLITE_INTERRUPT = 9;
const SQLITE_IOERR = 10;
const SQLITE_CORRUPT = 11;
const SQLITE_NOTFOUND = 12;
const SQLITE_FULL = 13;
const SQLITE_CANTOPEN = 14;
const SQLITE_PROTOCOL = 15;
const SQLITE_EMPTY = 16;
const SQLITE_SCHEMA = 17;
const SQLITE_TOOBIG = 18;
const SQLITE_CONSTRAINT = 19;
const SQLITE_MISMATCH = 20;
const SQLITE_MISUSE = 21;
const SQLITE_NOLFS = 22;
const SQLITE_AUTH = 23;
const SQLITE_FORMAT = 24;
const SQLITE_RANGE = 25;
const SQLITE_NOTADB = 26;
const SQLITE_NOTICE = 27;
const SQLITE_WARNING = 28;
const SQLITE_ROW = 100;
const SQLITE_DONE = 101;

// Extended error codes.
const SQLITE_IOERR_ACCESS = 3338;
const SQLITE_IOERR_CHECKRESERVEDLOCK = 3594;
const SQLITE_IOERR_CLOSE = 4106;
const SQLITE_IOERR_DATA = 8202;
const SQLITE_IOERR_DELETE = 2570;
const SQLITE_IOERR_DELETE_NOENT = 5898;
const SQLITE_IOERR_DIR_FSYNC = 1290;
const SQLITE_IOERR_FSTAT = 1802;
const SQLITE_IOERR_FSYNC = 1034;
const SQLITE_IOERR_GETTEMPPATH = 6410;
const SQLITE_IOERR_LOCK = 3850;
const SQLITE_IOERR_NOMEM = 3082;
const SQLITE_IOERR_READ = 266;
const SQLITE_IOERR_RDLOCK = 2314;
const SQLITE_IOERR_SEEK = 5642;
const SQLITE_IOERR_SHORT_READ = 522;
const SQLITE_IOERR_TRUNCATE = 1546;
const SQLITE_IOERR_UNLOCK = 2058;
const SQLITE_IOERR_VNODE = 6922;
const SQLITE_IOERR_WRITE = 778;
const SQLITE_IOERR_BEGIN_ATOMIC = 7434;
const SQLITE_IOERR_COMMIT_ATOMIC = 7690;
const SQLITE_IOERR_ROLLBACK_ATOMIC = 7946;

// Other extended result codes.
const SQLITE_CONSTRAINT_CHECK = 275;
const SQLITE_CONSTRAINT_COMMITHOOK = 531;
const SQLITE_CONSTRAINT_FOREIGNKEY = 787;
const SQLITE_CONSTRAINT_FUNCTION = 1043;
const SQLITE_CONSTRAINT_NOTNULL = 1299;
const SQLITE_CONSTRAINT_PINNED = 2835;
const SQLITE_CONSTRAINT_PRIMARYKEY = 1555;
const SQLITE_CONSTRAINT_ROWID = 2579;
const SQLITE_CONSTRAINT_TRIGGER = 1811;
const SQLITE_CONSTRAINT_UNIQUE = 2067;
const SQLITE_CONSTRAINT_VTAB = 2323;

// Open flags.
// https://www.sqlite.org/c3ref/c_open_autoproxy.html
const SQLITE_OPEN_READONLY = 0x00000001;
const SQLITE_OPEN_READWRITE = 0x00000002;
const SQLITE_OPEN_CREATE = 0x00000004;
const SQLITE_OPEN_DELETEONCLOSE = 0x00000008;
const SQLITE_OPEN_EXCLUSIVE = 0x00000010;
const SQLITE_OPEN_AUTOPROXY = 0x00000020;
const SQLITE_OPEN_URI = 0x00000040;
const SQLITE_OPEN_MEMORY = 0x00000080;
const SQLITE_OPEN_MAIN_DB = 0x00000100;
const SQLITE_OPEN_TEMP_DB = 0x00000200;
const SQLITE_OPEN_TRANSIENT_DB = 0x00000400;
const SQLITE_OPEN_MAIN_JOURNAL = 0x00000800;
const SQLITE_OPEN_TEMP_JOURNAL = 0x00001000;
const SQLITE_OPEN_SUBJOURNAL = 0x00002000;
const SQLITE_OPEN_SUPER_JOURNAL = 0x00004000;
const SQLITE_OPEN_NOMUTEX = 0x00008000;
const SQLITE_OPEN_FULLMUTEX = 0x00010000;
const SQLITE_OPEN_SHAREDCACHE = 0x00020000;
const SQLITE_OPEN_PRIVATECACHE = 0x00040000;
const SQLITE_OPEN_WAL = 0x00080000;
const SQLITE_OPEN_NOFOLLOW = 0x01000000;

// Locking levels.
// https://www.sqlite.org/c3ref/c_lock_exclusive.html
const SQLITE_LOCK_NONE = 0;
const SQLITE_LOCK_SHARED = 1;
const SQLITE_LOCK_RESERVED = 2;
const SQLITE_LOCK_PENDING = 3;
const SQLITE_LOCK_EXCLUSIVE = 4;

// Device characteristics.
// https://www.sqlite.org/c3ref/c_iocap_atomic.html
const SQLITE_IOCAP_ATOMIC = 0x00000001;
const SQLITE_IOCAP_ATOMIC512 = 0x00000002;
const SQLITE_IOCAP_ATOMIC1K = 0x00000004;
const SQLITE_IOCAP_ATOMIC2K = 0x00000008;
const SQLITE_IOCAP_ATOMIC4K = 0x00000010;
const SQLITE_IOCAP_ATOMIC8K = 0x00000020;
const SQLITE_IOCAP_ATOMIC16K = 0x00000040;
const SQLITE_IOCAP_ATOMIC32K = 0x00000080;
const SQLITE_IOCAP_ATOMIC64K = 0x00000100;
const SQLITE_IOCAP_SAFE_APPEND = 0x00000200;
const SQLITE_IOCAP_SEQUENTIAL = 0x00000400;
const SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN = 0x00000800;
const SQLITE_IOCAP_POWERSAFE_OVERWRITE = 0x00001000;
const SQLITE_IOCAP_IMMUTABLE = 0x00002000;
const SQLITE_IOCAP_BATCH_ATOMIC = 0x00004000;

// xAccess flags.
// https://www.sqlite.org/c3ref/c_access_exists.html
const SQLITE_ACCESS_EXISTS = 0;
const SQLITE_ACCESS_READWRITE = 1;
const SQLITE_ACCESS_READ = 2;

// File control opcodes
// https://www.sqlite.org/c3ref/c_fcntl_begin_atomic_write.html#sqlitefcntlbeginatomicwrite
const SQLITE_FCNTL_LOCKSTATE = 1; 
const SQLITE_FCNTL_GET_LOCKPROXYFILE = 2; 
const SQLITE_FCNTL_SET_LOCKPROXYFILE = 3; 
const SQLITE_FCNTL_LAST_ERRNO = 4; 
const SQLITE_FCNTL_SIZE_HINT = 5; 
const SQLITE_FCNTL_CHUNK_SIZE = 6; 
const SQLITE_FCNTL_FILE_POINTER = 7; 
const SQLITE_FCNTL_SYNC_OMITTED = 8; 
const SQLITE_FCNTL_WIN32_AV_RETRY = 9; 
const SQLITE_FCNTL_PERSIST_WAL = 10; 
const SQLITE_FCNTL_OVERWRITE = 11; 
const SQLITE_FCNTL_VFSNAME = 12; 
const SQLITE_FCNTL_POWERSAFE_OVERWRITE = 13; 
const SQLITE_FCNTL_PRAGMA = 14; 
const SQLITE_FCNTL_BUSYHANDLER = 15; 
const SQLITE_FCNTL_TEMPFILENAME = 16; 
const SQLITE_FCNTL_MMAP_SIZE = 18; 
const SQLITE_FCNTL_TRACE = 19; 
const SQLITE_FCNTL_HAS_MOVED = 20; 
const SQLITE_FCNTL_SYNC = 21; 
const SQLITE_FCNTL_COMMIT_PHASETWO = 22; 
const SQLITE_FCNTL_WIN32_SET_HANDLE = 23; 
const SQLITE_FCNTL_WAL_BLOCK = 24; 
const SQLITE_FCNTL_ZIPVFS = 25; 
const SQLITE_FCNTL_RBU = 26; 
const SQLITE_FCNTL_VFS_POINTER = 27; 
const SQLITE_FCNTL_JOURNAL_POINTER = 28; 
const SQLITE_FCNTL_WIN32_GET_HANDLE = 29; 
const SQLITE_FCNTL_PDB = 30; 
const SQLITE_FCNTL_BEGIN_ATOMIC_WRITE = 31; 
const SQLITE_FCNTL_COMMIT_ATOMIC_WRITE = 32; 
const SQLITE_FCNTL_ROLLBACK_ATOMIC_WRITE = 33; 
const SQLITE_FCNTL_LOCK_TIMEOUT = 34; 
const SQLITE_FCNTL_DATA_VERSION = 35; 
const SQLITE_FCNTL_SIZE_LIMIT = 36; 
const SQLITE_FCNTL_CKPT_DONE = 37; 
const SQLITE_FCNTL_RESERVE_BYTES = 38; 
const SQLITE_FCNTL_CKPT_START = 39;

// Fundamental datatypes.
// https://www.sqlite.org/c3ref/c_blob.html
const SQLITE_INTEGER = 1;
const SQLITE_FLOAT = 2;
const SQLITE_TEXT = 3;
const SQLITE_BLOB = 4;
const SQLITE_NULL = 5;

// Special destructor behavior.
// https://www.sqlite.org/c3ref/c_static.html
const SQLITE_STATIC = 0;
const SQLITE_TRANSIENT = -1;

// Text encodings.
// https://sqlite.org/c3ref/c_any.html
const SQLITE_UTF8 = 1;     /* IMP: R-37514-35566 */
const SQLITE_UTF16LE = 2;  /* IMP: R-03371-37637 */
const SQLITE_UTF16BE = 3;  /* IMP: R-51971-34154 */
const SQLITE_UTF16 = 4;    /* Use native byte order */

// Module constraint ops.
const SQLITE_INDEX_CONSTRAINT_EQ        = 2;
const SQLITE_INDEX_CONSTRAINT_GT        = 4;
const SQLITE_INDEX_CONSTRAINT_LE        = 8;
const SQLITE_INDEX_CONSTRAINT_LT        = 16;
const SQLITE_INDEX_CONSTRAINT_GE        = 32;
const SQLITE_INDEX_CONSTRAINT_MATCH     = 64;
const SQLITE_INDEX_CONSTRAINT_LIKE      = 65;
const SQLITE_INDEX_CONSTRAINT_GLOB      = 66;
const SQLITE_INDEX_CONSTRAINT_REGEXP    = 67;
const SQLITE_INDEX_CONSTRAINT_NE        = 68;
const SQLITE_INDEX_CONSTRAINT_ISNOT     = 69;
const SQLITE_INDEX_CONSTRAINT_ISNOTNULL = 70;
const SQLITE_INDEX_CONSTRAINT_ISNULL    = 71;
const SQLITE_INDEX_CONSTRAINT_IS        = 72;
const SQLITE_INDEX_CONSTRAINT_FUNCTION  = 150;
const SQLITE_INDEX_SCAN_UNIQUE          = 1;  /* Scan visits at most = 1 row */

// Function flags
const SQLITE_DETERMINISTIC = 0x000000800;
const SQLITE_DIRECTONLY    = 0x000080000;
const SQLITE_SUBTYPE       = 0x000100000;
const SQLITE_INNOCUOUS     = 0x000200000;

// Sync flags
const SQLITE_SYNC_NORMAL   = 0x00002;
const SQLITE_SYNC_FULL     = 0x00003;
const SQLITE_SYNC_DATAONLY = 0x00010;

// Authorizer action codes
const SQLITE_CREATE_INDEX        = 1;
const SQLITE_CREATE_TABLE        = 2;
const SQLITE_CREATE_TEMP_INDEX   = 3;
const SQLITE_CREATE_TEMP_TABLE   = 4;
const SQLITE_CREATE_TEMP_TRIGGER = 5;
const SQLITE_CREATE_TEMP_VIEW    = 6;
const SQLITE_CREATE_TRIGGER      = 7;
const SQLITE_CREATE_VIEW         = 8;
const SQLITE_DELETE              = 9;
const SQLITE_DROP_INDEX          = 10;
const SQLITE_DROP_TABLE          = 11;
const SQLITE_DROP_TEMP_INDEX     = 12;
const SQLITE_DROP_TEMP_TABLE     = 13;
const SQLITE_DROP_TEMP_TRIGGER   = 14;
const SQLITE_DROP_TEMP_VIEW      = 15;
const SQLITE_DROP_TRIGGER        = 16;
const SQLITE_DROP_VIEW           = 17;
const SQLITE_INSERT              = 18;
const SQLITE_PRAGMA              = 19;
const SQLITE_READ                = 20;
const SQLITE_SELECT              = 21;
const SQLITE_TRANSACTION         = 22;
const SQLITE_UPDATE              = 23;
const SQLITE_ATTACH              = 24;
const SQLITE_DETACH              = 25;
const SQLITE_ALTER_TABLE         = 26;
const SQLITE_REINDEX             = 27;
const SQLITE_ANALYZE             = 28;
const SQLITE_CREATE_VTABLE       = 29;
const SQLITE_DROP_VTABLE         = 30;
const SQLITE_FUNCTION            = 31;
const SQLITE_SAVEPOINT           = 32;
const SQLITE_COPY                = 0;
const SQLITE_RECURSIVE           = 33;

// Authorizer return codes
const SQLITE_DENY   = 1;
const SQLITE_IGNORE = 2;

// Limit categories
const SQLITE_LIMIT_LENGTH              = 0;
const SQLITE_LIMIT_SQL_LENGTH          = 1;
const SQLITE_LIMIT_COLUMN              = 2;
const SQLITE_LIMIT_EXPR_DEPTH          = 3;
const SQLITE_LIMIT_COMPOUND_SELECT     = 4;
const SQLITE_LIMIT_VDBE_OP             = 5;
const SQLITE_LIMIT_FUNCTION_ARG        = 6;
const SQLITE_LIMIT_ATTACHED            = 7;
const SQLITE_LIMIT_LIKE_PATTERN_LENGTH = 8;
const SQLITE_LIMIT_VARIABLE_NUMBER     = 9;
const SQLITE_LIMIT_TRIGGER_DEPTH       = 10;
const SQLITE_LIMIT_WORKER_THREADS      = 11;

const SQLITE_PREPARE_PERSISTENT = 0x01;
const SQLITE_PREPARE_NORMALIZED = 0x02;
const SQLITE_PREPARE_NO_VTAB = 0x04;

/***/ },

/***/ "../../node_modules/async-mutex/index.mjs"
/*!************************************************!*\
  !*** ../../node_modules/async-mutex/index.mjs ***!
  \************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   E_ALREADY_LOCKED: () => (/* binding */ E_ALREADY_LOCKED),
/* harmony export */   E_CANCELED: () => (/* binding */ E_CANCELED),
/* harmony export */   E_TIMEOUT: () => (/* binding */ E_TIMEOUT),
/* harmony export */   Mutex: () => (/* binding */ Mutex),
/* harmony export */   Semaphore: () => (/* binding */ Semaphore),
/* harmony export */   tryAcquire: () => (/* binding */ tryAcquire),
/* harmony export */   withTimeout: () => (/* binding */ withTimeout)
/* harmony export */ });
const E_TIMEOUT = new Error('timeout while waiting for mutex to become available');
const E_ALREADY_LOCKED = new Error('mutex already locked');
const E_CANCELED = new Error('request for lock canceled');

var __awaiter$2 = ( false) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class Semaphore {
    constructor(_value, _cancelError = E_CANCELED) {
        this._value = _value;
        this._cancelError = _cancelError;
        this._queue = [];
        this._weightedWaiters = [];
    }
    acquire(weight = 1, priority = 0) {
        if (weight <= 0)
            throw new Error(`invalid weight ${weight}: must be positive`);
        return new Promise((resolve, reject) => {
            const task = { resolve, reject, weight, priority };
            const i = findIndexFromEnd(this._queue, (other) => priority <= other.priority);
            if (i === -1 && weight <= this._value) {
                // Needs immediate dispatch, skip the queue
                this._dispatchItem(task);
            }
            else {
                this._queue.splice(i + 1, 0, task);
            }
        });
    }
    runExclusive(callback_1) {
        return __awaiter$2(this, arguments, void 0, function* (callback, weight = 1, priority = 0) {
            const [value, release] = yield this.acquire(weight, priority);
            try {
                return yield callback(value);
            }
            finally {
                release();
            }
        });
    }
    waitForUnlock(weight = 1, priority = 0) {
        if (weight <= 0)
            throw new Error(`invalid weight ${weight}: must be positive`);
        if (this._couldLockImmediately(weight, priority)) {
            return Promise.resolve();
        }
        else {
            return new Promise((resolve) => {
                if (!this._weightedWaiters[weight - 1])
                    this._weightedWaiters[weight - 1] = [];
                insertSorted(this._weightedWaiters[weight - 1], { resolve, priority });
            });
        }
    }
    isLocked() {
        return this._value <= 0;
    }
    getValue() {
        return this._value;
    }
    setValue(value) {
        this._value = value;
        this._dispatchQueue();
    }
    release(weight = 1) {
        if (weight <= 0)
            throw new Error(`invalid weight ${weight}: must be positive`);
        this._value += weight;
        this._dispatchQueue();
    }
    cancel() {
        this._queue.forEach((entry) => entry.reject(this._cancelError));
        this._queue = [];
    }
    _dispatchQueue() {
        this._drainUnlockWaiters();
        while (this._queue.length > 0 && this._queue[0].weight <= this._value) {
            this._dispatchItem(this._queue.shift());
            this._drainUnlockWaiters();
        }
    }
    _dispatchItem(item) {
        const previousValue = this._value;
        this._value -= item.weight;
        item.resolve([previousValue, this._newReleaser(item.weight)]);
    }
    _newReleaser(weight) {
        let called = false;
        return () => {
            if (called)
                return;
            called = true;
            this.release(weight);
        };
    }
    _drainUnlockWaiters() {
        if (this._queue.length === 0) {
            for (let weight = this._value; weight > 0; weight--) {
                const waiters = this._weightedWaiters[weight - 1];
                if (!waiters)
                    continue;
                waiters.forEach((waiter) => waiter.resolve());
                this._weightedWaiters[weight - 1] = [];
            }
        }
        else {
            const queuedPriority = this._queue[0].priority;
            for (let weight = this._value; weight > 0; weight--) {
                const waiters = this._weightedWaiters[weight - 1];
                if (!waiters)
                    continue;
                const i = waiters.findIndex((waiter) => waiter.priority <= queuedPriority);
                (i === -1 ? waiters : waiters.splice(0, i))
                    .forEach((waiter => waiter.resolve()));
            }
        }
    }
    _couldLockImmediately(weight, priority) {
        return (this._queue.length === 0 || this._queue[0].priority < priority) &&
            weight <= this._value;
    }
}
function insertSorted(a, v) {
    const i = findIndexFromEnd(a, (other) => v.priority <= other.priority);
    a.splice(i + 1, 0, v);
}
function findIndexFromEnd(a, predicate) {
    for (let i = a.length - 1; i >= 0; i--) {
        if (predicate(a[i])) {
            return i;
        }
    }
    return -1;
}

var __awaiter$1 = ( false) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class Mutex {
    constructor(cancelError) {
        this._semaphore = new Semaphore(1, cancelError);
    }
    acquire() {
        return __awaiter$1(this, arguments, void 0, function* (priority = 0) {
            const [, releaser] = yield this._semaphore.acquire(1, priority);
            return releaser;
        });
    }
    runExclusive(callback, priority = 0) {
        return this._semaphore.runExclusive(() => callback(), 1, priority);
    }
    isLocked() {
        return this._semaphore.isLocked();
    }
    waitForUnlock(priority = 0) {
        return this._semaphore.waitForUnlock(1, priority);
    }
    release() {
        if (this._semaphore.isLocked())
            this._semaphore.release();
    }
    cancel() {
        return this._semaphore.cancel();
    }
}

var __awaiter = ( false) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
function withTimeout(sync, timeout, timeoutError = E_TIMEOUT) {
    return {
        acquire: (weightOrPriority, priority) => {
            let weight;
            if (isSemaphore(sync)) {
                weight = weightOrPriority;
            }
            else {
                weight = undefined;
                priority = weightOrPriority;
            }
            if (weight !== undefined && weight <= 0) {
                throw new Error(`invalid weight ${weight}: must be positive`);
            }
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                let isTimeout = false;
                const handle = setTimeout(() => {
                    isTimeout = true;
                    reject(timeoutError);
                }, timeout);
                try {
                    const ticket = yield (isSemaphore(sync)
                        ? sync.acquire(weight, priority)
                        : sync.acquire(priority));
                    if (isTimeout) {
                        const release = Array.isArray(ticket) ? ticket[1] : ticket;
                        release();
                    }
                    else {
                        clearTimeout(handle);
                        resolve(ticket);
                    }
                }
                catch (e) {
                    if (!isTimeout) {
                        clearTimeout(handle);
                        reject(e);
                    }
                }
            }));
        },
        runExclusive(callback, weight, priority) {
            return __awaiter(this, void 0, void 0, function* () {
                let release = () => undefined;
                try {
                    const ticket = yield this.acquire(weight, priority);
                    if (Array.isArray(ticket)) {
                        release = ticket[1];
                        return yield callback(ticket[0]);
                    }
                    else {
                        release = ticket;
                        return yield callback();
                    }
                }
                finally {
                    release();
                }
            });
        },
        release(weight) {
            sync.release(weight);
        },
        cancel() {
            return sync.cancel();
        },
        waitForUnlock: (weightOrPriority, priority) => {
            let weight;
            if (isSemaphore(sync)) {
                weight = weightOrPriority;
            }
            else {
                weight = undefined;
                priority = weightOrPriority;
            }
            if (weight !== undefined && weight <= 0) {
                throw new Error(`invalid weight ${weight}: must be positive`);
            }
            return new Promise((resolve, reject) => {
                const handle = setTimeout(() => reject(timeoutError), timeout);
                (isSemaphore(sync)
                    ? sync.waitForUnlock(weight, priority)
                    : sync.waitForUnlock(priority)).then(() => {
                    clearTimeout(handle);
                    resolve();
                });
            });
        },
        isLocked: () => sync.isLocked(),
        getValue: () => sync.getValue(),
        setValue: (value) => sync.setValue(value),
    };
}
function isSemaphore(sync) {
    return sync.getValue !== undefined;
}

// eslint-disable-next-lisne @typescript-eslint/explicit-module-boundary-types
function tryAcquire(sync, alreadyAcquiredError = E_ALREADY_LOCKED) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return withTimeout(sync, 0, alreadyAcquiredError);
}




/***/ },

/***/ "../../node_modules/comlink/dist/esm/comlink.mjs"
/*!*******************************************************!*\
  !*** ../../node_modules/comlink/dist/esm/comlink.mjs ***!
  \*******************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   createEndpoint: () => (/* binding */ createEndpoint),
/* harmony export */   expose: () => (/* binding */ expose),
/* harmony export */   finalizer: () => (/* binding */ finalizer),
/* harmony export */   proxy: () => (/* binding */ proxy),
/* harmony export */   proxyMarker: () => (/* binding */ proxyMarker),
/* harmony export */   releaseProxy: () => (/* binding */ releaseProxy),
/* harmony export */   transfer: () => (/* binding */ transfer),
/* harmony export */   transferHandlers: () => (/* binding */ transferHandlers),
/* harmony export */   windowEndpoint: () => (/* binding */ windowEndpoint),
/* harmony export */   wrap: () => (/* binding */ wrap)
/* harmony export */ });
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
const proxyMarker = Symbol("Comlink.proxy");
const createEndpoint = Symbol("Comlink.endpoint");
const releaseProxy = Symbol("Comlink.releaseProxy");
const finalizer = Symbol("Comlink.finalizer");
const throwMarker = Symbol("Comlink.thrown");
const isObject = (val) => (typeof val === "object" && val !== null) || typeof val === "function";
/**
 * Internal transfer handle to handle objects marked to proxy.
 */
const proxyTransferHandler = {
    canHandle: (val) => isObject(val) && val[proxyMarker],
    serialize(obj) {
        const { port1, port2 } = new MessageChannel();
        expose(obj, port1);
        return [port2, [port2]];
    },
    deserialize(port) {
        port.start();
        return wrap(port);
    },
};
/**
 * Internal transfer handler to handle thrown exceptions.
 */
const throwTransferHandler = {
    canHandle: (value) => isObject(value) && throwMarker in value,
    serialize({ value }) {
        let serialized;
        if (value instanceof Error) {
            serialized = {
                isError: true,
                value: {
                    message: value.message,
                    name: value.name,
                    stack: value.stack,
                },
            };
        }
        else {
            serialized = { isError: false, value };
        }
        return [serialized, []];
    },
    deserialize(serialized) {
        if (serialized.isError) {
            throw Object.assign(new Error(serialized.value.message), serialized.value);
        }
        throw serialized.value;
    },
};
/**
 * Allows customizing the serialization of certain values.
 */
const transferHandlers = new Map([
    ["proxy", proxyTransferHandler],
    ["throw", throwTransferHandler],
]);
function isAllowedOrigin(allowedOrigins, origin) {
    for (const allowedOrigin of allowedOrigins) {
        if (origin === allowedOrigin || allowedOrigin === "*") {
            return true;
        }
        if (allowedOrigin instanceof RegExp && allowedOrigin.test(origin)) {
            return true;
        }
    }
    return false;
}
function expose(obj, ep = globalThis, allowedOrigins = ["*"]) {
    ep.addEventListener("message", function callback(ev) {
        if (!ev || !ev.data) {
            return;
        }
        if (!isAllowedOrigin(allowedOrigins, ev.origin)) {
            console.warn(`Invalid origin '${ev.origin}' for comlink proxy`);
            return;
        }
        const { id, type, path } = Object.assign({ path: [] }, ev.data);
        const argumentList = (ev.data.argumentList || []).map(fromWireValue);
        let returnValue;
        try {
            const parent = path.slice(0, -1).reduce((obj, prop) => obj[prop], obj);
            const rawValue = path.reduce((obj, prop) => obj[prop], obj);
            switch (type) {
                case "GET" /* MessageType.GET */:
                    {
                        returnValue = rawValue;
                    }
                    break;
                case "SET" /* MessageType.SET */:
                    {
                        parent[path.slice(-1)[0]] = fromWireValue(ev.data.value);
                        returnValue = true;
                    }
                    break;
                case "APPLY" /* MessageType.APPLY */:
                    {
                        returnValue = rawValue.apply(parent, argumentList);
                    }
                    break;
                case "CONSTRUCT" /* MessageType.CONSTRUCT */:
                    {
                        const value = new rawValue(...argumentList);
                        returnValue = proxy(value);
                    }
                    break;
                case "ENDPOINT" /* MessageType.ENDPOINT */:
                    {
                        const { port1, port2 } = new MessageChannel();
                        expose(obj, port2);
                        returnValue = transfer(port1, [port1]);
                    }
                    break;
                case "RELEASE" /* MessageType.RELEASE */:
                    {
                        returnValue = undefined;
                    }
                    break;
                default:
                    return;
            }
        }
        catch (value) {
            returnValue = { value, [throwMarker]: 0 };
        }
        Promise.resolve(returnValue)
            .catch((value) => {
            return { value, [throwMarker]: 0 };
        })
            .then((returnValue) => {
            const [wireValue, transferables] = toWireValue(returnValue);
            ep.postMessage(Object.assign(Object.assign({}, wireValue), { id }), transferables);
            if (type === "RELEASE" /* MessageType.RELEASE */) {
                // detach and deactive after sending release response above.
                ep.removeEventListener("message", callback);
                closeEndPoint(ep);
                if (finalizer in obj && typeof obj[finalizer] === "function") {
                    obj[finalizer]();
                }
            }
        })
            .catch((error) => {
            // Send Serialization Error To Caller
            const [wireValue, transferables] = toWireValue({
                value: new TypeError("Unserializable return value"),
                [throwMarker]: 0,
            });
            ep.postMessage(Object.assign(Object.assign({}, wireValue), { id }), transferables);
        });
    });
    if (ep.start) {
        ep.start();
    }
}
function isMessagePort(endpoint) {
    return endpoint.constructor.name === "MessagePort";
}
function closeEndPoint(endpoint) {
    if (isMessagePort(endpoint))
        endpoint.close();
}
function wrap(ep, target) {
    const pendingListeners = new Map();
    ep.addEventListener("message", function handleMessage(ev) {
        const { data } = ev;
        if (!data || !data.id) {
            return;
        }
        const resolver = pendingListeners.get(data.id);
        if (!resolver) {
            return;
        }
        try {
            resolver(data);
        }
        finally {
            pendingListeners.delete(data.id);
        }
    });
    return createProxy(ep, pendingListeners, [], target);
}
function throwIfProxyReleased(isReleased) {
    if (isReleased) {
        throw new Error("Proxy has been released and is not useable");
    }
}
function releaseEndpoint(ep) {
    return requestResponseMessage(ep, new Map(), {
        type: "RELEASE" /* MessageType.RELEASE */,
    }).then(() => {
        closeEndPoint(ep);
    });
}
const proxyCounter = new WeakMap();
const proxyFinalizers = "FinalizationRegistry" in globalThis &&
    new FinalizationRegistry((ep) => {
        const newCount = (proxyCounter.get(ep) || 0) - 1;
        proxyCounter.set(ep, newCount);
        if (newCount === 0) {
            releaseEndpoint(ep);
        }
    });
function registerProxy(proxy, ep) {
    const newCount = (proxyCounter.get(ep) || 0) + 1;
    proxyCounter.set(ep, newCount);
    if (proxyFinalizers) {
        proxyFinalizers.register(proxy, ep, proxy);
    }
}
function unregisterProxy(proxy) {
    if (proxyFinalizers) {
        proxyFinalizers.unregister(proxy);
    }
}
function createProxy(ep, pendingListeners, path = [], target = function () { }) {
    let isProxyReleased = false;
    const proxy = new Proxy(target, {
        get(_target, prop) {
            throwIfProxyReleased(isProxyReleased);
            if (prop === releaseProxy) {
                return () => {
                    unregisterProxy(proxy);
                    releaseEndpoint(ep);
                    pendingListeners.clear();
                    isProxyReleased = true;
                };
            }
            if (prop === "then") {
                if (path.length === 0) {
                    return { then: () => proxy };
                }
                const r = requestResponseMessage(ep, pendingListeners, {
                    type: "GET" /* MessageType.GET */,
                    path: path.map((p) => p.toString()),
                }).then(fromWireValue);
                return r.then.bind(r);
            }
            return createProxy(ep, pendingListeners, [...path, prop]);
        },
        set(_target, prop, rawValue) {
            throwIfProxyReleased(isProxyReleased);
            // FIXME: ES6 Proxy Handler `set` methods are supposed to return a
            // boolean. To show good will, we return true asynchronously ¯\_(ツ)_/¯
            const [value, transferables] = toWireValue(rawValue);
            return requestResponseMessage(ep, pendingListeners, {
                type: "SET" /* MessageType.SET */,
                path: [...path, prop].map((p) => p.toString()),
                value,
            }, transferables).then(fromWireValue);
        },
        apply(_target, _thisArg, rawArgumentList) {
            throwIfProxyReleased(isProxyReleased);
            const last = path[path.length - 1];
            if (last === createEndpoint) {
                return requestResponseMessage(ep, pendingListeners, {
                    type: "ENDPOINT" /* MessageType.ENDPOINT */,
                }).then(fromWireValue);
            }
            // We just pretend that `bind()` didn’t happen.
            if (last === "bind") {
                return createProxy(ep, pendingListeners, path.slice(0, -1));
            }
            const [argumentList, transferables] = processArguments(rawArgumentList);
            return requestResponseMessage(ep, pendingListeners, {
                type: "APPLY" /* MessageType.APPLY */,
                path: path.map((p) => p.toString()),
                argumentList,
            }, transferables).then(fromWireValue);
        },
        construct(_target, rawArgumentList) {
            throwIfProxyReleased(isProxyReleased);
            const [argumentList, transferables] = processArguments(rawArgumentList);
            return requestResponseMessage(ep, pendingListeners, {
                type: "CONSTRUCT" /* MessageType.CONSTRUCT */,
                path: path.map((p) => p.toString()),
                argumentList,
            }, transferables).then(fromWireValue);
        },
    });
    registerProxy(proxy, ep);
    return proxy;
}
function myFlat(arr) {
    return Array.prototype.concat.apply([], arr);
}
function processArguments(argumentList) {
    const processed = argumentList.map(toWireValue);
    return [processed.map((v) => v[0]), myFlat(processed.map((v) => v[1]))];
}
const transferCache = new WeakMap();
function transfer(obj, transfers) {
    transferCache.set(obj, transfers);
    return obj;
}
function proxy(obj) {
    return Object.assign(obj, { [proxyMarker]: true });
}
function windowEndpoint(w, context = globalThis, targetOrigin = "*") {
    return {
        postMessage: (msg, transferables) => w.postMessage(msg, targetOrigin, transferables),
        addEventListener: context.addEventListener.bind(context),
        removeEventListener: context.removeEventListener.bind(context),
    };
}
function toWireValue(value) {
    for (const [name, handler] of transferHandlers) {
        if (handler.canHandle(value)) {
            const [serializedValue, transferables] = handler.serialize(value);
            return [
                {
                    type: "HANDLER" /* WireValueType.HANDLER */,
                    name,
                    value: serializedValue,
                },
                transferables,
            ];
        }
    }
    return [
        {
            type: "RAW" /* WireValueType.RAW */,
            value,
        },
        transferCache.get(value) || [],
    ];
}
function fromWireValue(value) {
    switch (value.type) {
        case "HANDLER" /* WireValueType.HANDLER */:
            return transferHandlers.get(value.name).deserialize(value.value);
        case "RAW" /* WireValueType.RAW */:
            return value.value;
    }
}
function requestResponseMessage(ep, pendingListeners, msg, transfers) {
    return new Promise((resolve) => {
        const id = generateUUID();
        pendingListeners.set(id, resolve);
        if (ep.start) {
            ep.start();
        }
        ep.postMessage(Object.assign({ id }, msg), transfers);
    });
}
function generateUUID() {
    return new Array(4)
        .fill(0)
        .map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16))
        .join("-");
}


//# sourceMappingURL=comlink.mjs.map


/***/ },

/***/ "../common/dist/bundle.mjs"
/*!*********************************!*\
  !*** ../common/dist/bundle.mjs ***!
  \*********************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AbortOperation: () => (/* binding */ AbortOperation),
/* harmony export */   AbstractPowerSyncDatabase: () => (/* binding */ AbstractPowerSyncDatabase),
/* harmony export */   AbstractPowerSyncDatabaseOpenFactory: () => (/* binding */ AbstractPowerSyncDatabaseOpenFactory),
/* harmony export */   AbstractQueryProcessor: () => (/* binding */ AbstractQueryProcessor),
/* harmony export */   AbstractRemote: () => (/* binding */ AbstractRemote),
/* harmony export */   AbstractStreamingSyncImplementation: () => (/* binding */ AbstractStreamingSyncImplementation),
/* harmony export */   ArrayComparator: () => (/* binding */ ArrayComparator),
/* harmony export */   BaseObserver: () => (/* binding */ BaseObserver),
/* harmony export */   Column: () => (/* binding */ Column),
/* harmony export */   ColumnType: () => (/* binding */ ColumnType),
/* harmony export */   ConnectionClosedError: () => (/* binding */ ConnectionClosedError),
/* harmony export */   ConnectionManager: () => (/* binding */ ConnectionManager),
/* harmony export */   ControlledExecutor: () => (/* binding */ ControlledExecutor),
/* harmony export */   CrudBatch: () => (/* binding */ CrudBatch),
/* harmony export */   CrudEntry: () => (/* binding */ CrudEntry),
/* harmony export */   CrudTransaction: () => (/* binding */ CrudTransaction),
/* harmony export */   DEFAULT_CRUD_BATCH_LIMIT: () => (/* binding */ DEFAULT_CRUD_BATCH_LIMIT),
/* harmony export */   DEFAULT_CRUD_UPLOAD_THROTTLE_MS: () => (/* binding */ DEFAULT_CRUD_UPLOAD_THROTTLE_MS),
/* harmony export */   DEFAULT_INDEX_COLUMN_OPTIONS: () => (/* binding */ DEFAULT_INDEX_COLUMN_OPTIONS),
/* harmony export */   DEFAULT_INDEX_OPTIONS: () => (/* binding */ DEFAULT_INDEX_OPTIONS),
/* harmony export */   DEFAULT_LOCK_TIMEOUT_MS: () => (/* binding */ DEFAULT_LOCK_TIMEOUT_MS),
/* harmony export */   DEFAULT_POWERSYNC_CLOSE_OPTIONS: () => (/* binding */ DEFAULT_POWERSYNC_CLOSE_OPTIONS),
/* harmony export */   DEFAULT_POWERSYNC_DB_OPTIONS: () => (/* binding */ DEFAULT_POWERSYNC_DB_OPTIONS),
/* harmony export */   DEFAULT_PRESSURE_LIMITS: () => (/* binding */ DEFAULT_PRESSURE_LIMITS),
/* harmony export */   DEFAULT_REMOTE_LOGGER: () => (/* binding */ DEFAULT_REMOTE_LOGGER),
/* harmony export */   DEFAULT_REMOTE_OPTIONS: () => (/* binding */ DEFAULT_REMOTE_OPTIONS),
/* harmony export */   DEFAULT_RETRY_DELAY_MS: () => (/* binding */ DEFAULT_RETRY_DELAY_MS),
/* harmony export */   DEFAULT_ROW_COMPARATOR: () => (/* binding */ DEFAULT_ROW_COMPARATOR),
/* harmony export */   DEFAULT_STREAMING_SYNC_OPTIONS: () => (/* binding */ DEFAULT_STREAMING_SYNC_OPTIONS),
/* harmony export */   DEFAULT_STREAM_CONNECTION_OPTIONS: () => (/* binding */ DEFAULT_STREAM_CONNECTION_OPTIONS),
/* harmony export */   DEFAULT_SYNC_CLIENT_IMPLEMENTATION: () => (/* binding */ DEFAULT_SYNC_CLIENT_IMPLEMENTATION),
/* harmony export */   DEFAULT_TABLE_OPTIONS: () => (/* binding */ DEFAULT_TABLE_OPTIONS),
/* harmony export */   DEFAULT_WATCH_QUERY_OPTIONS: () => (/* binding */ DEFAULT_WATCH_QUERY_OPTIONS),
/* harmony export */   DEFAULT_WATCH_THROTTLE_MS: () => (/* binding */ DEFAULT_WATCH_THROTTLE_MS),
/* harmony export */   DataStream: () => (/* binding */ DataStream),
/* harmony export */   DiffTriggerOperation: () => (/* binding */ DiffTriggerOperation),
/* harmony export */   DifferentialQueryProcessor: () => (/* binding */ DifferentialQueryProcessor),
/* harmony export */   EMPTY_DIFFERENTIAL: () => (/* binding */ EMPTY_DIFFERENTIAL),
/* harmony export */   FalsyComparator: () => (/* binding */ FalsyComparator),
/* harmony export */   FetchImplementationProvider: () => (/* binding */ FetchImplementationProvider),
/* harmony export */   FetchStrategy: () => (/* binding */ FetchStrategy),
/* harmony export */   GetAllQuery: () => (/* binding */ GetAllQuery),
/* harmony export */   Index: () => (/* binding */ Index),
/* harmony export */   IndexedColumn: () => (/* binding */ IndexedColumn),
/* harmony export */   InvalidSQLCharacters: () => (/* binding */ InvalidSQLCharacters),
/* harmony export */   LockType: () => (/* binding */ LockType),
/* harmony export */   LogLevel: () => (/* binding */ LogLevel),
/* harmony export */   MAX_AMOUNT_OF_COLUMNS: () => (/* binding */ MAX_AMOUNT_OF_COLUMNS),
/* harmony export */   MAX_OP_ID: () => (/* binding */ MAX_OP_ID),
/* harmony export */   OnChangeQueryProcessor: () => (/* binding */ OnChangeQueryProcessor),
/* harmony export */   OpType: () => (/* binding */ OpType),
/* harmony export */   OpTypeEnum: () => (/* binding */ OpTypeEnum),
/* harmony export */   OplogEntry: () => (/* binding */ OplogEntry),
/* harmony export */   PSInternalTable: () => (/* binding */ PSInternalTable),
/* harmony export */   PowerSyncControlCommand: () => (/* binding */ PowerSyncControlCommand),
/* harmony export */   RowUpdateType: () => (/* binding */ RowUpdateType),
/* harmony export */   Schema: () => (/* binding */ Schema),
/* harmony export */   SqliteBucketStorage: () => (/* binding */ SqliteBucketStorage),
/* harmony export */   SyncClientImplementation: () => (/* binding */ SyncClientImplementation),
/* harmony export */   SyncDataBatch: () => (/* binding */ SyncDataBatch),
/* harmony export */   SyncDataBucket: () => (/* binding */ SyncDataBucket),
/* harmony export */   SyncProgress: () => (/* binding */ SyncProgress),
/* harmony export */   SyncStatus: () => (/* binding */ SyncStatus),
/* harmony export */   SyncStreamConnectionMethod: () => (/* binding */ SyncStreamConnectionMethod),
/* harmony export */   Table: () => (/* binding */ Table),
/* harmony export */   TableV2: () => (/* binding */ TableV2),
/* harmony export */   UpdateType: () => (/* binding */ UpdateType),
/* harmony export */   UploadQueueStats: () => (/* binding */ UploadQueueStats),
/* harmony export */   WatchedQueryListenerEvent: () => (/* binding */ WatchedQueryListenerEvent),
/* harmony export */   column: () => (/* binding */ column),
/* harmony export */   compilableQueryWatch: () => (/* binding */ compilableQueryWatch),
/* harmony export */   createBaseLogger: () => (/* binding */ createBaseLogger),
/* harmony export */   createLogger: () => (/* binding */ createLogger),
/* harmony export */   extractTableUpdates: () => (/* binding */ extractTableUpdates),
/* harmony export */   isBatchedUpdateNotification: () => (/* binding */ isBatchedUpdateNotification),
/* harmony export */   isContinueCheckpointRequest: () => (/* binding */ isContinueCheckpointRequest),
/* harmony export */   isDBAdapter: () => (/* binding */ isDBAdapter),
/* harmony export */   isPowerSyncDatabaseOptionsWithSettings: () => (/* binding */ isPowerSyncDatabaseOptionsWithSettings),
/* harmony export */   isSQLOpenFactory: () => (/* binding */ isSQLOpenFactory),
/* harmony export */   isSQLOpenOptions: () => (/* binding */ isSQLOpenOptions),
/* harmony export */   isStreamingKeepalive: () => (/* binding */ isStreamingKeepalive),
/* harmony export */   isStreamingSyncCheckpoint: () => (/* binding */ isStreamingSyncCheckpoint),
/* harmony export */   isStreamingSyncCheckpointComplete: () => (/* binding */ isStreamingSyncCheckpointComplete),
/* harmony export */   isStreamingSyncCheckpointDiff: () => (/* binding */ isStreamingSyncCheckpointDiff),
/* harmony export */   isStreamingSyncCheckpointPartiallyComplete: () => (/* binding */ isStreamingSyncCheckpointPartiallyComplete),
/* harmony export */   isStreamingSyncData: () => (/* binding */ isStreamingSyncData),
/* harmony export */   isSyncNewCheckpointRequest: () => (/* binding */ isSyncNewCheckpointRequest),
/* harmony export */   parseQuery: () => (/* binding */ parseQuery),
/* harmony export */   runOnSchemaChange: () => (/* binding */ runOnSchemaChange),
/* harmony export */   sanitizeSQL: () => (/* binding */ sanitizeSQL),
/* harmony export */   sanitizeUUID: () => (/* binding */ sanitizeUUID)
/* harmony export */ });
/* harmony import */ var async_mutex__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! async-mutex */ "../../node_modules/async-mutex/index.mjs");


function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var dom = {};

var eventIterator = {};

var hasRequiredEventIterator;

function requireEventIterator () {
	if (hasRequiredEventIterator) return eventIterator;
	hasRequiredEventIterator = 1;
	Object.defineProperty(eventIterator, "__esModule", { value: true });
	class EventQueue {
	    constructor() {
	        this.pullQueue = [];
	        this.pushQueue = [];
	        this.eventHandlers = {};
	        this.isPaused = false;
	        this.isStopped = false;
	    }
	    push(value) {
	        if (this.isStopped)
	            return;
	        const resolution = { value, done: false };
	        if (this.pullQueue.length) {
	            const placeholder = this.pullQueue.shift();
	            if (placeholder)
	                placeholder.resolve(resolution);
	        }
	        else {
	            this.pushQueue.push(Promise.resolve(resolution));
	            if (this.highWaterMark !== undefined &&
	                this.pushQueue.length >= this.highWaterMark &&
	                !this.isPaused) {
	                this.isPaused = true;
	                if (this.eventHandlers.highWater) {
	                    this.eventHandlers.highWater();
	                }
	                else if (console) {
	                    console.warn(`EventIterator queue reached ${this.pushQueue.length} items`);
	                }
	            }
	        }
	    }
	    stop() {
	        if (this.isStopped)
	            return;
	        this.isStopped = true;
	        this.remove();
	        for (const placeholder of this.pullQueue) {
	            placeholder.resolve({ value: undefined, done: true });
	        }
	        this.pullQueue.length = 0;
	    }
	    fail(error) {
	        if (this.isStopped)
	            return;
	        this.isStopped = true;
	        this.remove();
	        if (this.pullQueue.length) {
	            for (const placeholder of this.pullQueue) {
	                placeholder.reject(error);
	            }
	            this.pullQueue.length = 0;
	        }
	        else {
	            const rejection = Promise.reject(error);
	            /* Attach error handler to avoid leaking an unhandled promise rejection. */
	            rejection.catch(() => { });
	            this.pushQueue.push(rejection);
	        }
	    }
	    remove() {
	        Promise.resolve().then(() => {
	            if (this.removeCallback)
	                this.removeCallback();
	        });
	    }
	    [Symbol.asyncIterator]() {
	        return {
	            next: (value) => {
	                const result = this.pushQueue.shift();
	                if (result) {
	                    if (this.lowWaterMark !== undefined &&
	                        this.pushQueue.length <= this.lowWaterMark &&
	                        this.isPaused) {
	                        this.isPaused = false;
	                        if (this.eventHandlers.lowWater) {
	                            this.eventHandlers.lowWater();
	                        }
	                    }
	                    return result;
	                }
	                else if (this.isStopped) {
	                    return Promise.resolve({ value: undefined, done: true });
	                }
	                else {
	                    return new Promise((resolve, reject) => {
	                        this.pullQueue.push({ resolve, reject });
	                    });
	                }
	            },
	            return: () => {
	                this.isStopped = true;
	                this.pushQueue.length = 0;
	                this.remove();
	                return Promise.resolve({ value: undefined, done: true });
	            },
	        };
	    }
	}
	class EventIterator {
	    constructor(listen, { highWaterMark = 100, lowWaterMark = 1 } = {}) {
	        const queue = new EventQueue();
	        queue.highWaterMark = highWaterMark;
	        queue.lowWaterMark = lowWaterMark;
	        queue.removeCallback =
	            listen({
	                push: value => queue.push(value),
	                stop: () => queue.stop(),
	                fail: error => queue.fail(error),
	                on: (event, fn) => {
	                    queue.eventHandlers[event] = fn;
	                },
	            }) || (() => { });
	        this[Symbol.asyncIterator] = () => queue[Symbol.asyncIterator]();
	        Object.freeze(this);
	    }
	}
	eventIterator.EventIterator = EventIterator;
	eventIterator.default = EventIterator;
	return eventIterator;
}

var hasRequiredDom;

function requireDom () {
	if (hasRequiredDom) return dom;
	hasRequiredDom = 1;
	Object.defineProperty(dom, "__esModule", { value: true });
	const event_iterator_1 = requireEventIterator();
	dom.EventIterator = event_iterator_1.EventIterator;
	function subscribe(event, options, evOptions) {
	    return new event_iterator_1.EventIterator(({ push }) => {
	        this.addEventListener(event, push, options);
	        return () => this.removeEventListener(event, push, options);
	    }, evOptions);
	}
	dom.subscribe = subscribe;
	dom.default = event_iterator_1.EventIterator;
	return dom;
}

var domExports = requireDom();

var logger$1 = {exports: {}};

/*!
 * js-logger - http://github.com/jonnyreeves/js-logger
 * Jonny Reeves, http://jonnyreeves.co.uk/
 * js-logger may be freely distributed under the MIT license.
 */
var logger = logger$1.exports;

var hasRequiredLogger;

function requireLogger () {
	if (hasRequiredLogger) return logger$1.exports;
	hasRequiredLogger = 1;
	(function (module) {
		(function (global) {

			// Top level module for the global, static logger instance.
			var Logger = { };

			// For those that are at home that are keeping score.
			Logger.VERSION = "1.6.1";

			// Function which handles all incoming log messages.
			var logHandler;

			// Map of ContextualLogger instances by name; used by Logger.get() to return the same named instance.
			var contextualLoggersByNameMap = {};

			// Polyfill for ES5's Function.bind.
			var bind = function(scope, func) {
				return function() {
					return func.apply(scope, arguments);
				};
			};

			// Super exciting object merger-matron 9000 adding another 100 bytes to your download.
			var merge = function () {
				var args = arguments, target = args[0], key, i;
				for (i = 1; i < args.length; i++) {
					for (key in args[i]) {
						if (!(key in target) && args[i].hasOwnProperty(key)) {
							target[key] = args[i][key];
						}
					}
				}
				return target;
			};

			// Helper to define a logging level object; helps with optimisation.
			var defineLogLevel = function(value, name) {
				return { value: value, name: name };
			};

			// Predefined logging levels.
			Logger.TRACE = defineLogLevel(1, 'TRACE');
			Logger.DEBUG = defineLogLevel(2, 'DEBUG');
			Logger.INFO = defineLogLevel(3, 'INFO');
			Logger.TIME = defineLogLevel(4, 'TIME');
			Logger.WARN = defineLogLevel(5, 'WARN');
			Logger.ERROR = defineLogLevel(8, 'ERROR');
			Logger.OFF = defineLogLevel(99, 'OFF');

			// Inner class which performs the bulk of the work; ContextualLogger instances can be configured independently
			// of each other.
			var ContextualLogger = function(defaultContext) {
				this.context = defaultContext;
				this.setLevel(defaultContext.filterLevel);
				this.log = this.info;  // Convenience alias.
			};

			ContextualLogger.prototype = {
				// Changes the current logging level for the logging instance.
				setLevel: function (newLevel) {
					// Ensure the supplied Level object looks valid.
					if (newLevel && "value" in newLevel) {
						this.context.filterLevel = newLevel;
					}
				},
				
				// Gets the current logging level for the logging instance
				getLevel: function () {
					return this.context.filterLevel;
				},

				// Is the logger configured to output messages at the supplied level?
				enabledFor: function (lvl) {
					var filterLevel = this.context.filterLevel;
					return lvl.value >= filterLevel.value;
				},

				trace: function () {
					this.invoke(Logger.TRACE, arguments);
				},

				debug: function () {
					this.invoke(Logger.DEBUG, arguments);
				},

				info: function () {
					this.invoke(Logger.INFO, arguments);
				},

				warn: function () {
					this.invoke(Logger.WARN, arguments);
				},

				error: function () {
					this.invoke(Logger.ERROR, arguments);
				},

				time: function (label) {
					if (typeof label === 'string' && label.length > 0) {
						this.invoke(Logger.TIME, [ label, 'start' ]);
					}
				},

				timeEnd: function (label) {
					if (typeof label === 'string' && label.length > 0) {
						this.invoke(Logger.TIME, [ label, 'end' ]);
					}
				},

				// Invokes the logger callback if it's not being filtered.
				invoke: function (level, msgArgs) {
					if (logHandler && this.enabledFor(level)) {
						logHandler(msgArgs, merge({ level: level }, this.context));
					}
				}
			};

			// Protected instance which all calls to the to level `Logger` module will be routed through.
			var globalLogger = new ContextualLogger({ filterLevel: Logger.OFF });

			// Configure the global Logger instance.
			(function() {
				// Shortcut for optimisers.
				var L = Logger;

				L.enabledFor = bind(globalLogger, globalLogger.enabledFor);
				L.trace = bind(globalLogger, globalLogger.trace);
				L.debug = bind(globalLogger, globalLogger.debug);
				L.time = bind(globalLogger, globalLogger.time);
				L.timeEnd = bind(globalLogger, globalLogger.timeEnd);
				L.info = bind(globalLogger, globalLogger.info);
				L.warn = bind(globalLogger, globalLogger.warn);
				L.error = bind(globalLogger, globalLogger.error);

				// Don't forget the convenience alias!
				L.log = L.info;
			}());

			// Set the global logging handler.  The supplied function should expect two arguments, the first being an arguments
			// object with the supplied log messages and the second being a context object which contains a hash of stateful
			// parameters which the logging function can consume.
			Logger.setHandler = function (func) {
				logHandler = func;
			};

			// Sets the global logging filter level which applies to *all* previously registered, and future Logger instances.
			// (note that named loggers (retrieved via `Logger.get`) can be configured independently if required).
			Logger.setLevel = function(level) {
				// Set the globalLogger's level.
				globalLogger.setLevel(level);

				// Apply this level to all registered contextual loggers.
				for (var key in contextualLoggersByNameMap) {
					if (contextualLoggersByNameMap.hasOwnProperty(key)) {
						contextualLoggersByNameMap[key].setLevel(level);
					}
				}
			};

			// Gets the global logging filter level
			Logger.getLevel = function() {
				return globalLogger.getLevel();
			};

			// Retrieve a ContextualLogger instance.  Note that named loggers automatically inherit the global logger's level,
			// default context and log handler.
			Logger.get = function (name) {
				// All logger instances are cached so they can be configured ahead of use.
				return contextualLoggersByNameMap[name] ||
					(contextualLoggersByNameMap[name] = new ContextualLogger(merge({ name: name }, globalLogger.context)));
			};

			// CreateDefaultHandler returns a handler function which can be passed to `Logger.setHandler()` which will
			// write to the window's console object (if present); the optional options object can be used to customise the
			// formatter used to format each log message.
			Logger.createDefaultHandler = function (options) {
				options = options || {};

				options.formatter = options.formatter || function defaultMessageFormatter(messages, context) {
					// Prepend the logger's name to the log message for easy identification.
					if (context.name) {
						messages.unshift("[" + context.name + "]");
					}
				};

				// Map of timestamps by timer labels used to track `#time` and `#timeEnd()` invocations in environments
				// that don't offer a native console method.
				var timerStartTimeByLabelMap = {};

				// Support for IE8+ (and other, slightly more sane environments)
				var invokeConsoleMethod = function (hdlr, messages) {
					Function.prototype.apply.call(hdlr, console, messages);
				};

				// Check for the presence of a logger.
				if (typeof console === "undefined") {
					return function () { /* no console */ };
				}

				return function(messages, context) {
					// Convert arguments object to Array.
					messages = Array.prototype.slice.call(messages);

					var hdlr = console.log;
					var timerLabel;

					if (context.level === Logger.TIME) {
						timerLabel = (context.name ? '[' + context.name + '] ' : '') + messages[0];

						if (messages[1] === 'start') {
							if (console.time) {
								console.time(timerLabel);
							}
							else {
								timerStartTimeByLabelMap[timerLabel] = new Date().getTime();
							}
						}
						else {
							if (console.timeEnd) {
								console.timeEnd(timerLabel);
							}
							else {
								invokeConsoleMethod(hdlr, [ timerLabel + ': ' +
									(new Date().getTime() - timerStartTimeByLabelMap[timerLabel]) + 'ms' ]);
							}
						}
					}
					else {
						// Delegate through to custom warn/error loggers if present on the console.
						if (context.level === Logger.WARN && console.warn) {
							hdlr = console.warn;
						} else if (context.level === Logger.ERROR && console.error) {
							hdlr = console.error;
						} else if (context.level === Logger.INFO && console.info) {
							hdlr = console.info;
						} else if (context.level === Logger.DEBUG && console.debug) {
							hdlr = console.debug;
						} else if (context.level === Logger.TRACE && console.trace) {
							hdlr = console.trace;
						}

						options.formatter(messages, context);
						invokeConsoleMethod(hdlr, messages);
					}
				};
			};

			// Configure and example a Default implementation which writes to the `window.console` (if present).  The
			// `options` hash can be used to configure the default logLevel and provide a custom message formatter.
			Logger.useDefaults = function(options) {
				Logger.setLevel(options && options.defaultLevel || Logger.DEBUG);
				Logger.setHandler(Logger.createDefaultHandler(options));
			};

			// Createa an alias to useDefaults to avoid reaking a react-hooks rule.
			Logger.setDefaults = Logger.useDefaults;

			// Export to popular environments boilerplate.
			if (module.exports) {
				module.exports = Logger;
			}
			else {
				Logger._prevLogger = global.Logger;

				Logger.noConflict = function () {
					global.Logger = Logger._prevLogger;
					return Logger;
				};

				global.Logger = Logger;
			}
		}(logger)); 
	} (logger$1));
	return logger$1.exports;
}

var loggerExports = requireLogger();
var Logger = /*@__PURE__*/getDefaultExportFromCjs(loggerExports);

/**
 * Set of generic interfaces to allow PowerSync compatibility with
 * different SQLite DB implementations.
 */
/**
 * Update table operation numbers from SQLite
 */
var RowUpdateType;
(function (RowUpdateType) {
    RowUpdateType[RowUpdateType["SQLITE_INSERT"] = 18] = "SQLITE_INSERT";
    RowUpdateType[RowUpdateType["SQLITE_DELETE"] = 9] = "SQLITE_DELETE";
    RowUpdateType[RowUpdateType["SQLITE_UPDATE"] = 23] = "SQLITE_UPDATE";
})(RowUpdateType || (RowUpdateType = {}));
function isBatchedUpdateNotification(update) {
    return 'tables' in update;
}
function extractTableUpdates(update) {
    return isBatchedUpdateNotification(update) ? update.tables : [update.table];
}

/**
 * @internal The priority used by the core extension to indicate that a full sync was completed.
 */
const FULL_SYNC_PRIORITY = 2147483647;
/**
 * Provides realtime progress on how PowerSync is downloading rows.
 *
 * The progress until the next complete sync is available through the fields on {@link ProgressWithOperations},
 * which this class implements.
 * Additionally, the {@link SyncProgress.untilPriority} method can be used to otbain progress towards
 * a specific priority (instead of the progress for the entire download).
 *
 * The reported progress always reflects the status towards the end of a sync iteration (after
 * which a consistent snapshot of all buckets is available locally).
 *
 * In rare cases (in particular, when a [compacting](https://docs.powersync.com/usage/lifecycle-maintenance/compacting-buckets)
 * operation takes place between syncs), it's possible for the returned numbers to be slightly
 * inaccurate. For this reason, {@link SyncProgress} should be seen as an approximation of progress.
 * The information returned is good enough to build progress bars, but not exact enough to track
 * individual download counts.
 *
 * Also note that data is downloaded in bulk, which means that individual counters are unlikely
 * to be updated one-by-one.
 */
class SyncProgress {
    internal;
    totalOperations;
    downloadedOperations;
    downloadedFraction;
    constructor(internal) {
        this.internal = internal;
        const untilCompletion = this.untilPriority(FULL_SYNC_PRIORITY);
        this.totalOperations = untilCompletion.totalOperations;
        this.downloadedOperations = untilCompletion.downloadedOperations;
        this.downloadedFraction = untilCompletion.downloadedFraction;
    }
    /**
     * Returns download progress towards all data up until the specified priority being received.
     *
     * The returned {@link ProgressWithOperations} tracks the target amount of operations that need
     * to be downloaded in total and how many of them have already been received.
     */
    untilPriority(priority) {
        let total = 0;
        let downloaded = 0;
        for (const progress of Object.values(this.internal)) {
            // Include higher-priority buckets, which are represented by lower numbers.
            if (progress.priority <= priority) {
                downloaded += progress.since_last;
                total += progress.target_count - progress.at_last;
            }
        }
        let progress = total == 0 ? 0.0 : downloaded / total;
        return {
            totalOperations: total,
            downloadedOperations: downloaded,
            downloadedFraction: progress
        };
    }
}

class SyncStatus {
    options;
    constructor(options) {
        this.options = options;
    }
    /**
     * Returns the used sync client implementation (either the one implemented in JavaScript or the newer Rust-based
     * implementation).
     *
     * This information is only available after a connection has been requested.
     */
    get clientImplementation() {
        return this.options.clientImplementation;
    }
    /**
     * Indicates if the client is currently connected to the PowerSync service.
     *
     * @returns {boolean} True if connected, false otherwise. Defaults to false if not specified.
     */
    get connected() {
        return this.options.connected ?? false;
    }
    /**
     * Indicates if the client is in the process of establishing a connection to the PowerSync service.
     *
     * @returns {boolean} True if connecting, false otherwise. Defaults to false if not specified.
     */
    get connecting() {
        return this.options.connecting ?? false;
    }
    /**
     * Time that a last sync has fully completed, if any.
     * This timestamp is reset to null after a restart of the PowerSync service.
     *
     * @returns {Date | undefined} The timestamp of the last successful sync, or undefined if no sync has completed.
     */
    get lastSyncedAt() {
        return this.options.lastSyncedAt;
    }
    /**
     * Indicates whether there has been at least one full sync completed since initialization.
     *
     * @returns {boolean | undefined} True if at least one sync has completed, false if no sync has completed,
     * or undefined when the state is still being loaded from the database.
     */
    get hasSynced() {
        return this.options.hasSynced;
    }
    /**
     * Provides the current data flow status regarding uploads and downloads.
     *
     * @returns {SyncDataFlowStatus} An object containing:
     * - downloading: True if actively downloading changes (only when connected is also true)
     * - uploading: True if actively uploading changes
     * Defaults to {downloading: false, uploading: false} if not specified.
     */
    get dataFlowStatus() {
        return (this.options.dataFlow ?? {
            /**
             * true if actively downloading changes.
             * This is only true when {@link connected} is also true.
             */
            downloading: false,
            /**
             * true if uploading changes.
             */
            uploading: false
        });
    }
    /**
     * All sync streams currently being tracked in teh database.
     *
     * This returns null when the database is currently being opened and we don't have reliable information about all
     * included streams yet.
     *
     * @experimental Sync streams are currently in alpha.
     */
    get syncStreams() {
        return this.options.dataFlow?.internalStreamSubscriptions?.map((core) => new SyncStreamStatusView(this, core));
    }
    /**
     * If the `stream` appears in {@link syncStreams}, returns the current status for that stream.
     *
     * @experimental Sync streams are currently in alpha.
     */
    forStream(stream) {
        const asJson = JSON.stringify(stream.parameters);
        const raw = this.options.dataFlow?.internalStreamSubscriptions?.find((r) => r.name == stream.name && asJson == JSON.stringify(r.parameters));
        return raw && new SyncStreamStatusView(this, raw);
    }
    /**
     * Provides sync status information for all bucket priorities, sorted by priority (highest first).
     *
     * @returns {SyncPriorityStatus[]} An array of status entries for different sync priority levels,
     * sorted with highest priorities (lower numbers) first.
     */
    get priorityStatusEntries() {
        return (this.options.priorityStatusEntries ?? []).slice().sort(SyncStatus.comparePriorities);
    }
    /**
     * A realtime progress report on how many operations have been downloaded and
     * how many are necessary in total to complete the next sync iteration.
     *
     * This field is only set when {@link SyncDataFlowStatus#downloading} is also true.
     */
    get downloadProgress() {
        const internalProgress = this.options.dataFlow?.downloadProgress;
        if (internalProgress == null) {
            return null;
        }
        return new SyncProgress(internalProgress);
    }
    /**
     * Reports the sync status (a pair of {@link SyncStatus#hasSynced} and {@link SyncStatus#lastSyncedAt} fields)
     * for a specific bucket priority level.
     *
     * When buckets with different priorities are declared, PowerSync may choose to synchronize higher-priority
     * buckets first. When a consistent view over all buckets for all priorities up until the given priority is
     * reached, PowerSync makes data from those buckets available before lower-priority buckets have finished
     * syncing.
     *
     * This method returns the status for the requested priority or the next higher priority level that has
     * status information available. This is because when PowerSync makes data for a given priority available,
     * all buckets in higher-priorities are guaranteed to be consistent with that checkpoint.
     *
     * For example, if PowerSync just finished synchronizing buckets in priority level 3, calling this method
     * with a priority of 1 may return information for priority level 3.
     *
     * @param {number} priority The bucket priority for which the status should be reported
     * @returns {SyncPriorityStatus} Status information for the requested priority level or the next higher level with available status
     */
    statusForPriority(priority) {
        // priorityStatusEntries are sorted by ascending priorities (so higher numbers to lower numbers).
        for (const known of this.priorityStatusEntries) {
            // We look for the first entry that doesn't have a higher priority.
            if (known.priority >= priority) {
                return known;
            }
        }
        // If we have a complete sync, that necessarily includes all priorities.
        return {
            priority,
            lastSyncedAt: this.lastSyncedAt,
            hasSynced: this.hasSynced
        };
    }
    /**
     * Compares this SyncStatus instance with another to determine if they are equal.
     * Equality is determined by comparing the serialized JSON representation of both instances.
     *
     * @param {SyncStatus} status The SyncStatus instance to compare against
     * @returns {boolean} True if the instances are considered equal, false otherwise
     */
    isEqual(status) {
        /**
         * By default Error object are serialized to an empty object.
         * This replaces Errors with more useful information before serialization.
         */
        const replacer = (_, value) => {
            if (value instanceof Error) {
                return {
                    name: value.name,
                    message: value.message,
                    stack: value.stack
                };
            }
            return value;
        };
        return JSON.stringify(this.options, replacer) == JSON.stringify(status.options, replacer);
    }
    /**
     * Creates a human-readable string representation of the current sync status.
     * Includes information about connection state, sync completion, and data flow.
     *
     * @returns {string} A string representation of the sync status
     */
    getMessage() {
        const dataFlow = this.dataFlowStatus;
        return `SyncStatus<connected: ${this.connected} connecting: ${this.connecting} lastSyncedAt: ${this.lastSyncedAt} hasSynced: ${this.hasSynced}. Downloading: ${dataFlow.downloading}. Uploading: ${dataFlow.uploading}. UploadError: ${dataFlow.uploadError}, DownloadError?: ${dataFlow.downloadError}>`;
    }
    /**
     * Serializes the SyncStatus instance to a plain object.
     *
     * @returns {SyncStatusOptions} A plain object representation of the sync status
     */
    toJSON() {
        return {
            connected: this.connected,
            connecting: this.connecting,
            dataFlow: {
                ...this.dataFlowStatus,
                uploadError: this.serializeError(this.dataFlowStatus.uploadError),
                downloadError: this.serializeError(this.dataFlowStatus.downloadError)
            },
            lastSyncedAt: this.lastSyncedAt,
            hasSynced: this.hasSynced,
            priorityStatusEntries: this.priorityStatusEntries
        };
    }
    /**
     * Not all errors are serializable over a MessagePort. E.g. some `DomExceptions` fail to be passed across workers.
     * This explicitly serializes errors in the SyncStatus.
     */
    serializeError(error) {
        if (typeof error == 'undefined') {
            return undefined;
        }
        return {
            name: error.name,
            message: error.message,
            stack: error.stack
        };
    }
    static comparePriorities(a, b) {
        return b.priority - a.priority; // Reverse because higher priorities have lower numbers
    }
}
class SyncStreamStatusView {
    status;
    core;
    subscription;
    constructor(status, core) {
        this.status = status;
        this.core = core;
        this.subscription = {
            name: core.name,
            parameters: core.parameters,
            active: core.active,
            isDefault: core.is_default,
            hasExplicitSubscription: core.has_explicit_subscription,
            expiresAt: core.expires_at != null ? new Date(core.expires_at * 1000) : null,
            hasSynced: core.last_synced_at != null,
            lastSyncedAt: core.last_synced_at != null ? new Date(core.last_synced_at * 1000) : null
        };
    }
    get progress() {
        if (this.status.dataFlowStatus.downloadProgress == null) {
            // Don't make download progress public if we're not currently downloading.
            return null;
        }
        const { total, downloaded } = this.core.progress;
        const progress = total == 0 ? 0.0 : downloaded / total;
        return { totalOperations: total, downloadedOperations: downloaded, downloadedFraction: progress };
    }
    get priority() {
        return this.core.priority;
    }
}

class UploadQueueStats {
    count;
    size;
    constructor(
    /**
     * Number of records in the upload queue.
     */
    count, 
    /**
     * Size of the upload queue in bytes.
     */
    size = null) {
        this.count = count;
        this.size = size;
    }
    toString() {
        if (this.size == null) {
            return `UploadQueueStats<count:${this.count}>`;
        }
        else {
            return `UploadQueueStats<count: $count size: ${this.size / 1024}kB>`;
        }
    }
}

class BaseObserver {
    listeners = new Set();
    constructor() { }
    dispose() {
        this.listeners.clear();
    }
    /**
     * Register a listener for updates to the PowerSync client.
     */
    registerListener(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    iterateListeners(cb) {
        for (const listener of this.listeners) {
            cb(listener);
        }
    }
    async iterateAsyncListeners(cb) {
        for (let i of Array.from(this.listeners.values())) {
            await cb(i);
        }
    }
}

class ControlledExecutor {
    task;
    /**
     * Represents the currently running task, which could be a Promise or undefined if no task is running.
     */
    runningTask;
    pendingTaskParam;
    /**
     * Flag to determine if throttling is enabled, which controls whether tasks are queued or run immediately.
     */
    isThrottling;
    closed;
    constructor(task, options) {
        this.task = task;
        const { throttleEnabled = true } = options ?? {};
        this.isThrottling = throttleEnabled;
        this.closed = false;
    }
    schedule(param) {
        if (this.closed) {
            return;
        }
        if (!this.isThrottling) {
            this.task(param);
            return;
        }
        if (this.runningTask) {
            // set or replace the pending task param with latest one
            this.pendingTaskParam = param;
            return;
        }
        this.execute(param);
    }
    dispose() {
        this.closed = true;
        if (this.runningTask) {
            this.runningTask = undefined;
        }
    }
    async execute(param) {
        this.runningTask = this.task(param);
        await this.runningTask;
        this.runningTask = undefined;
        if (this.pendingTaskParam) {
            const pendingParam = this.pendingTaskParam;
            this.pendingTaskParam = undefined;
            this.execute(pendingParam);
        }
    }
}

/**
 * A ponyfill for `Symbol.asyncIterator` that is compatible with the
 * [recommended polyfill](https://github.com/Azure/azure-sdk-for-js/blob/%40azure/core-asynciterator-polyfill_1.0.2/sdk/core/core-asynciterator-polyfill/src/index.ts#L4-L6)
 * we recommend for React Native.
 *
 * As long as we use this symbol (instead of `for await` and `async *`) in this package, we can be compatible with async
 * iterators without requiring them.
 */
const symbolAsyncIterator = Symbol.asyncIterator ?? Symbol.for('Symbol.asyncIterator');
/**
 * Throttle a function to be called at most once every "wait" milliseconds,
 * on the trailing edge.
 *
 * Roughly equivalent to lodash/throttle with {leading: false, trailing: true}
 */
function throttleTrailing(func, wait) {
    let timeoutId = null;
    const later = () => {
        func();
        timeoutId = null;
    };
    return function () {
        if (timeoutId == null) {
            timeoutId = setTimeout(later, wait);
        }
    };
}
/**
 * Throttle a function to be called at most once every "wait" milliseconds,
 * on the leading and trailing edge.
 *
 * Roughly equivalent to lodash/throttle with {leading: true, trailing: true}
 */
function throttleLeadingTrailing(func, wait) {
    let timeoutId = null;
    let lastCallTime = 0;
    const invokeFunction = () => {
        func();
        lastCallTime = Date.now();
        timeoutId = null;
    };
    return function () {
        const now = Date.now();
        const timeToWait = wait - (now - lastCallTime);
        if (timeToWait <= 0) {
            // Leading edge: Call the function immediately if enough time has passed
            invokeFunction();
        }
        else if (!timeoutId) {
            // Set a timeout for the trailing edge if not already set
            timeoutId = setTimeout(invokeFunction, timeToWait);
        }
    };
}

/**
 * @internal
 */
class ConnectionManager extends BaseObserver {
    options;
    /**
     * Tracks active connection attempts
     */
    connectingPromise;
    /**
     * Tracks actively instantiating a streaming sync implementation.
     */
    syncStreamInitPromise;
    /**
     * Active disconnect operation. Calling disconnect multiple times
     * will resolve to the same operation.
     */
    disconnectingPromise;
    /**
     * Tracks the last parameters supplied to `connect` calls.
     * Calling `connect` multiple times in succession will result in:
     * - 1 pending connection operation which will be aborted.
     * - updating the last set of parameters while waiting for the pending
     *   attempt to be aborted
     * - internally connecting with the last set of parameters
     */
    pendingConnectionOptions;
    syncStreamImplementation;
    /**
     * Additional cleanup function which is called after the sync stream implementation
     * is disposed.
     */
    syncDisposer;
    /**
     * Subscriptions managed in this connection manager.
     *
     * On the web, these local subscriptions are merged across tabs by a shared worker.
     */
    locallyActiveSubscriptions = new Map();
    constructor(options) {
        super();
        this.options = options;
        this.connectingPromise = null;
        this.syncStreamInitPromise = null;
        this.disconnectingPromise = null;
        this.pendingConnectionOptions = null;
        this.syncStreamImplementation = null;
        this.syncDisposer = null;
    }
    get connector() {
        return this.pendingConnectionOptions?.connector ?? null;
    }
    get connectionOptions() {
        return this.pendingConnectionOptions?.options ?? null;
    }
    get logger() {
        return this.options.logger;
    }
    async close() {
        await this.syncStreamImplementation?.dispose();
        await this.syncDisposer?.();
    }
    async connect(connector, options) {
        // Keep track if there were pending operations before this call
        const hadPendingOptions = !!this.pendingConnectionOptions;
        // Update pending options to the latest values
        this.pendingConnectionOptions = {
            connector,
            options
        };
        // Disconnecting here provides aborting in progress connection attempts.
        // The connectInternal method will clear pending options once it starts connecting (with the options).
        // We only need to trigger a disconnect here if we have already reached the point of connecting.
        // If we do already have pending options, a disconnect has already been performed.
        // The connectInternal method also does a sanity disconnect to prevent straggler connections.
        // We should also disconnect if we have already completed a connection attempt.
        if (!hadPendingOptions || this.syncStreamImplementation) {
            await this.disconnectInternal();
        }
        // Triggers a connect which checks if pending options are available after the connect completes.
        // The completion can be for a successful, unsuccessful or aborted connection attempt.
        // If pending options are available another connection will be triggered.
        const checkConnection = async () => {
            if (this.pendingConnectionOptions) {
                // Pending options have been placed while connecting.
                // Need to reconnect.
                this.connectingPromise = this.connectInternal()
                    .catch(() => { })
                    .finally(checkConnection);
                return this.connectingPromise;
            }
            else {
                // Clear the connecting promise, done.
                this.connectingPromise = null;
                return;
            }
        };
        this.connectingPromise ??= this.connectInternal()
            .catch(() => { })
            .finally(checkConnection);
        return this.connectingPromise;
    }
    async connectInternal() {
        let appliedOptions = null;
        // This method ensures a disconnect before any connection attempt
        await this.disconnectInternal();
        /**
         * This portion creates a sync implementation which can be racy when disconnecting or
         * if multiple tabs on web are in use.
         * This is protected in an exclusive lock.
         * The promise tracks the creation which is used to synchronize disconnect attempts.
         */
        this.syncStreamInitPromise = new Promise(async (resolve, reject) => {
            try {
                if (!this.pendingConnectionOptions) {
                    this.logger.debug('No pending connection options found, not creating sync stream implementation');
                    // A disconnect could have cleared this.
                    resolve();
                    return;
                }
                if (this.disconnectingPromise) {
                    resolve();
                    return;
                }
                const { connector, options } = this.pendingConnectionOptions;
                appliedOptions = options;
                this.pendingConnectionOptions = null;
                const { sync, onDispose } = await this.options.createSyncImplementation(connector, {
                    subscriptions: this.activeStreams,
                    ...options
                });
                this.iterateListeners((l) => l.syncStreamCreated?.(sync));
                this.syncStreamImplementation = sync;
                this.syncDisposer = onDispose;
                await this.syncStreamImplementation.waitForReady();
                resolve();
            }
            catch (error) {
                reject(error);
            }
        });
        await this.syncStreamInitPromise;
        this.syncStreamInitPromise = null;
        if (!appliedOptions) {
            // A disconnect could have cleared the options which did not create a syncStreamImplementation
            return;
        }
        // It might be possible that a disconnect triggered between the last check
        // and this point. Awaiting here allows the sync stream to be cleared if disconnected.
        await this.disconnectingPromise;
        this.logger.debug('Attempting to connect to PowerSync instance');
        await this.syncStreamImplementation?.connect(appliedOptions);
    }
    /**
     * Close the sync connection.
     *
     * Use {@link connect} to connect again.
     */
    async disconnect() {
        // This will help abort pending connects
        this.pendingConnectionOptions = null;
        await this.disconnectInternal();
    }
    async disconnectInternal() {
        if (this.disconnectingPromise) {
            // A disconnect is already in progress
            return this.disconnectingPromise;
        }
        this.disconnectingPromise = this.performDisconnect();
        await this.disconnectingPromise;
        this.disconnectingPromise = null;
    }
    async performDisconnect() {
        // Wait if a sync stream implementation is being created before closing it
        // (syncStreamImplementation must be assigned before we can properly dispose it)
        await this.syncStreamInitPromise;
        // Keep reference to the sync stream implementation and disposer
        // The class members will be cleared before we trigger the disconnect
        // to prevent any further calls to the sync stream implementation.
        const sync = this.syncStreamImplementation;
        this.syncStreamImplementation = null;
        const disposer = this.syncDisposer;
        this.syncDisposer = null;
        await sync?.disconnect();
        await sync?.dispose();
        await disposer?.();
    }
    stream(adapter, name, parameters) {
        const desc = { name, parameters };
        const waitForFirstSync = (abort) => {
            return adapter.firstStatusMatching((s) => s.forStream(desc)?.subscription.hasSynced, abort);
        };
        return {
            ...desc,
            subscribe: async (options) => {
                // NOTE: We also run this command if a subscription already exists, because this increases the expiry date
                // (relevant if the app is closed before connecting again, where the last subscribe call determines the ttl).
                await adapter.rustSubscriptionsCommand({
                    subscribe: {
                        stream: {
                            name,
                            params: parameters
                        },
                        ttl: options?.ttl,
                        priority: options?.priority
                    }
                });
                if (!this.syncStreamImplementation) {
                    // We're not connected. So, update the offline sync status to reflect the new subscription.
                    // (With an active iteration, the sync client would include it in its state).
                    await adapter.resolveOfflineSyncStatus();
                }
                const key = `${name}|${JSON.stringify(parameters)}`;
                let subscription = this.locallyActiveSubscriptions.get(key);
                if (subscription == null) {
                    const clearSubscription = () => {
                        this.locallyActiveSubscriptions.delete(key);
                        this.subscriptionsMayHaveChanged();
                    };
                    subscription = new ActiveSubscription(name, parameters, this.logger, waitForFirstSync, clearSubscription);
                    this.locallyActiveSubscriptions.set(key, subscription);
                    this.subscriptionsMayHaveChanged();
                }
                return new SyncStreamSubscriptionHandle(subscription);
            },
            unsubscribeAll: async () => {
                await adapter.rustSubscriptionsCommand({ unsubscribe: { name, params: parameters } });
                this.subscriptionsMayHaveChanged();
            }
        };
    }
    /**
     * @internal exposed for testing
     */
    get activeStreams() {
        return [...this.locallyActiveSubscriptions.values()].map((a) => ({ name: a.name, params: a.parameters }));
    }
    subscriptionsMayHaveChanged() {
        this.syncStreamImplementation?.updateSubscriptions(this.activeStreams);
    }
}
class ActiveSubscription {
    name;
    parameters;
    logger;
    waitForFirstSync;
    clearSubscription;
    refcount = 0;
    constructor(name, parameters, logger, waitForFirstSync, clearSubscription) {
        this.name = name;
        this.parameters = parameters;
        this.logger = logger;
        this.waitForFirstSync = waitForFirstSync;
        this.clearSubscription = clearSubscription;
    }
    decrementRefCount() {
        this.refcount--;
        if (this.refcount == 0) {
            this.clearSubscription();
        }
    }
}
class SyncStreamSubscriptionHandle {
    subscription;
    active = true;
    constructor(subscription) {
        this.subscription = subscription;
        subscription.refcount++;
        _finalizer?.register(this, subscription);
    }
    get name() {
        return this.subscription.name;
    }
    get parameters() {
        return this.subscription.parameters;
    }
    waitForFirstSync(abort) {
        return this.subscription.waitForFirstSync(abort);
    }
    unsubscribe() {
        if (this.active) {
            this.active = false;
            _finalizer?.unregister(this);
            this.subscription.decrementRefCount();
        }
    }
}
const _finalizer = 'FinalizationRegistry' in globalThis
    ? new FinalizationRegistry((sub) => {
        sub.logger.warn(`A subscription to ${sub.name} with params ${JSON.stringify(sub.parameters)} leaked! Please ensure calling unsubscribe() when you don't need a subscription anymore. For global subscriptions, consider storing them in global fields to avoid this warning.`);
    })
    : null;

/**
 * An efficient comparator for {@link WatchedQuery} created with {@link Query#watch}. This has the ability to determine if a query
 * result has changes without necessarily processing all items in the result.
 */
class ArrayComparator {
    options;
    constructor(options) {
        this.options = options;
    }
    checkEquality(current, previous) {
        if (current.length === 0 && previous.length === 0) {
            return true;
        }
        if (current.length !== previous.length) {
            return false;
        }
        const { compareBy } = this.options;
        // At this point the lengths are equal
        for (let i = 0; i < current.length; i++) {
            const currentItem = compareBy(current[i]);
            const previousItem = compareBy(previous[i]);
            if (currentItem !== previousItem) {
                return false;
            }
        }
        return true;
    }
}
/**
 * Watched query comparator that always reports changed result sets.
 */
const FalsyComparator = {
    checkEquality: () => false // Default comparator that always returns false
};

/**
 * A BaseObserver that tracks the counts of listeners for each event type.
 */
class MetaBaseObserver extends BaseObserver {
    get listenerCounts() {
        const counts = {};
        let total = 0;
        for (const listener of this.listeners) {
            for (const key in listener) {
                if (listener[key]) {
                    counts[key] = (counts[key] ?? 0) + 1;
                    total++;
                }
            }
        }
        return {
            ...counts,
            total
        };
    }
    get listenerMeta() {
        return {
            counts: this.listenerCounts,
            // Allows registering a meta listener that will be notified of changes in listener counts
            registerListener: (listener) => {
                return this.metaListener.registerListener(listener);
            }
        };
    }
    metaListener;
    constructor() {
        super();
        this.metaListener = new BaseObserver();
    }
    registerListener(listener) {
        const dispose = super.registerListener(listener);
        const updatedCount = this.listenerCounts;
        this.metaListener.iterateListeners((l) => {
            l.listenersChanged?.(updatedCount);
        });
        return () => {
            dispose();
            const updatedCount = this.listenerCounts;
            this.metaListener.iterateListeners((l) => {
                l.listenersChanged?.(updatedCount);
            });
        };
    }
}

var WatchedQueryListenerEvent;
(function (WatchedQueryListenerEvent) {
    WatchedQueryListenerEvent["ON_DATA"] = "onData";
    WatchedQueryListenerEvent["ON_ERROR"] = "onError";
    WatchedQueryListenerEvent["ON_STATE_CHANGE"] = "onStateChange";
    WatchedQueryListenerEvent["SETTINGS_WILL_UPDATE"] = "settingsWillUpdate";
    WatchedQueryListenerEvent["CLOSED"] = "closed";
})(WatchedQueryListenerEvent || (WatchedQueryListenerEvent = {}));
const DEFAULT_WATCH_THROTTLE_MS = 30;
const DEFAULT_WATCH_QUERY_OPTIONS = {
    throttleMs: DEFAULT_WATCH_THROTTLE_MS,
    reportFetching: true
};

/**
 * Performs underlying watching and yields a stream of results.
 * @internal
 */
class AbstractQueryProcessor extends MetaBaseObserver {
    options;
    state;
    abortController;
    initialized;
    _closed;
    disposeListeners;
    get closed() {
        return this._closed;
    }
    constructor(options) {
        super();
        this.options = options;
        this.abortController = new AbortController();
        this._closed = false;
        this.state = this.constructInitialState();
        this.disposeListeners = null;
        this.initialized = this.init(this.abortController.signal);
    }
    constructInitialState() {
        return {
            isLoading: true,
            isFetching: this.reportFetching, // Only set to true if we will report updates in future
            error: null,
            lastUpdated: null,
            data: this.options.placeholderData
        };
    }
    get reportFetching() {
        return this.options.watchOptions.reportFetching ?? true;
    }
    async updateSettingsInternal(settings, signal) {
        // This may have been aborted while awaiting or if multiple calls to `updateSettings` were made
        if (this._closed || signal.aborted) {
            return;
        }
        this.options.watchOptions = settings;
        this.iterateListeners((l) => l[WatchedQueryListenerEvent.SETTINGS_WILL_UPDATE]?.());
        if (!this.state.isFetching && this.reportFetching) {
            await this.updateState({
                isFetching: true
            });
        }
        await this.runWithReporting(() => this.linkQuery({
            abortSignal: signal,
            settings
        }));
    }
    /**
     * Updates the underlying query.
     */
    async updateSettings(settings) {
        // Abort the previous request
        this.abortController.abort();
        // Keep track of this controller's abort status
        const abortController = new AbortController();
        // Allow this to be aborted externally
        this.abortController = abortController;
        await this.initialized;
        return this.updateSettingsInternal(settings, abortController.signal);
    }
    async updateState(update) {
        if (this._closed) {
            return;
        }
        if (typeof update.error !== 'undefined') {
            await this.iterateAsyncListenersWithError(async (l) => l.onError?.(update.error));
            // An error always stops for the current fetching state
            update.isFetching = false;
            update.isLoading = false;
        }
        Object.assign(this.state, { lastUpdated: new Date() }, update);
        if (typeof update.data !== 'undefined') {
            await this.iterateAsyncListenersWithError(async (l) => l.onData?.(this.state.data));
        }
        await this.iterateAsyncListenersWithError(async (l) => l.onStateChange?.(this.state));
    }
    /**
     * Configures base DB listeners and links the query to listeners.
     */
    async init(signal) {
        const { db } = this.options;
        const disposeCloseListener = db.registerListener({
            closing: async () => {
                await this.close();
            }
        });
        // Wait for the schema to be set before listening to changes
        await db.waitForReady();
        const disposeSchemaListener = db.registerListener({
            schemaChanged: async () => {
                await this.runWithReporting(async () => {
                    await this.updateSettings(this.options.watchOptions);
                });
            }
        });
        this.disposeListeners = () => {
            disposeCloseListener();
            disposeSchemaListener();
        };
        // Initial setup
        await this.runWithReporting(async () => {
            await this.updateSettingsInternal(this.options.watchOptions, signal);
        });
    }
    async close() {
        this._closed = true;
        this.abortController.abort();
        this.disposeListeners?.();
        this.disposeListeners = null;
        this.iterateListeners((l) => l.closed?.());
        this.listeners.clear();
    }
    /**
     * Runs a callback and reports errors to the error listeners.
     */
    async runWithReporting(callback) {
        try {
            await callback();
        }
        catch (error) {
            // This will update the error on the state and iterate error listeners
            await this.updateState({ error });
        }
    }
    /**
     * Iterate listeners and reports errors to onError handlers.
     */
    async iterateAsyncListenersWithError(callback) {
        try {
            await this.iterateAsyncListeners(async (l) => callback(l));
        }
        catch (error) {
            try {
                await this.iterateAsyncListeners(async (l) => l.onError?.(error));
            }
            catch (error) {
                // Errors here are ignored
                // since we are already in an error state
                this.options.db.logger.error('Watched query error handler threw an Error', error);
            }
        }
    }
}

/**
 * An empty differential result set.
 * This is used as the initial state for differential incrementally watched queries.
 */
const EMPTY_DIFFERENTIAL = {
    added: [],
    all: [],
    removed: [],
    updated: [],
    unchanged: []
};
/**
 * Default implementation of the {@link DifferentialWatchedQueryComparator} for watched queries.
 * It keys items by their `id` property if available, alternatively it uses JSON stringification
 * of the entire item for the key and comparison.
 */
const DEFAULT_ROW_COMPARATOR = {
    keyBy: (item) => {
        if (item && typeof item == 'object' && typeof item['id'] == 'string') {
            return item['id'];
        }
        return JSON.stringify(item);
    },
    compareBy: (item) => JSON.stringify(item)
};
/**
 * Uses the PowerSync onChange event to trigger watched queries.
 * Results are emitted on every change of the relevant tables.
 * @internal
 */
class DifferentialQueryProcessor extends AbstractQueryProcessor {
    options;
    comparator;
    constructor(options) {
        super(options);
        this.options = options;
        this.comparator = options.rowComparator ?? DEFAULT_ROW_COMPARATOR;
    }
    /*
     * @returns If the sets are equal
     */
    differentiate(current, previousMap) {
        const { keyBy, compareBy } = this.comparator;
        let hasChanged = false;
        const currentMap = new Map();
        const removedTracker = new Set(previousMap.keys());
        // Allow mutating to populate the data temporarily.
        const diff = {
            all: [],
            added: [],
            removed: [],
            updated: [],
            unchanged: []
        };
        /**
         * Looping over the current result set array is important to preserve
         * the ordering of the result set.
         * We can replace items in the current array with previous object references if they are equal.
         */
        for (const item of current) {
            const key = keyBy(item);
            const hash = compareBy(item);
            currentMap.set(key, { hash, item });
            const previousItem = previousMap.get(key);
            if (!previousItem) {
                // New item
                hasChanged = true;
                diff.added.push(item);
                diff.all.push(item);
            }
            else {
                // Existing item
                if (hash == previousItem.hash) {
                    diff.unchanged.push(previousItem.item);
                    // Use the previous object reference
                    diff.all.push(previousItem.item);
                    // update the map to preserve the reference
                    currentMap.set(key, previousItem);
                }
                else {
                    hasChanged = true;
                    diff.updated.push({ current: item, previous: previousItem.item });
                    // Use the new reference
                    diff.all.push(item);
                }
            }
            // The item is present, we don't consider it removed
            removedTracker.delete(key);
        }
        diff.removed = Array.from(removedTracker).map((key) => previousMap.get(key).item);
        hasChanged = hasChanged || diff.removed.length > 0;
        return {
            diff,
            hasChanged,
            map: currentMap
        };
    }
    async linkQuery(options) {
        const { db, watchOptions } = this.options;
        const { abortSignal } = options;
        const compiledQuery = watchOptions.query.compile();
        const tables = await db.resolveTables(compiledQuery.sql, compiledQuery.parameters, {
            tables: options.settings.triggerOnTables
        });
        let currentMap = new Map();
        // populate the currentMap from the placeholder data
        this.state.data.forEach((item) => {
            currentMap.set(this.comparator.keyBy(item), {
                hash: this.comparator.compareBy(item),
                item
            });
        });
        db.onChangeWithCallback({
            onChange: async () => {
                if (this.closed || abortSignal.aborted) {
                    return;
                }
                // This fires for each change of the relevant tables
                try {
                    if (this.reportFetching && !this.state.isFetching) {
                        await this.updateState({ isFetching: true });
                    }
                    const partialStateUpdate = {};
                    // Always run the query if an underlying table has changed
                    const result = await watchOptions.query.execute({
                        sql: compiledQuery.sql,
                        // Allows casting from ReadOnlyArray[unknown] to Array<unknown>
                        // This allows simpler compatibility with PowerSync queries
                        parameters: [...compiledQuery.parameters],
                        db: this.options.db
                    });
                    if (abortSignal.aborted) {
                        return;
                    }
                    if (this.reportFetching) {
                        partialStateUpdate.isFetching = false;
                    }
                    if (this.state.isLoading) {
                        partialStateUpdate.isLoading = false;
                    }
                    const { diff, hasChanged, map } = this.differentiate(result, currentMap);
                    // Update for future comparisons
                    currentMap = map;
                    if (hasChanged) {
                        await this.iterateAsyncListenersWithError((l) => l.onDiff?.(diff));
                        Object.assign(partialStateUpdate, {
                            data: diff.all
                        });
                    }
                    if (this.state.error) {
                        partialStateUpdate.error = null;
                    }
                    if (Object.keys(partialStateUpdate).length > 0) {
                        await this.updateState(partialStateUpdate);
                    }
                }
                catch (error) {
                    await this.updateState({ error });
                }
            },
            onError: async (error) => {
                await this.updateState({ error });
            }
        }, {
            signal: abortSignal,
            tables,
            throttleMs: watchOptions.throttleMs,
            triggerImmediate: true // used to emit the initial state
        });
    }
}

/**
 * Uses the PowerSync onChange event to trigger watched queries.
 * Results are emitted on every change of the relevant tables.
 * @internal
 */
class OnChangeQueryProcessor extends AbstractQueryProcessor {
    options;
    constructor(options) {
        super(options);
        this.options = options;
    }
    /**
     * @returns If the sets are equal
     */
    checkEquality(current, previous) {
        // Use the provided comparator if available. Assume values are unique if not available.
        return this.options.comparator?.checkEquality?.(current, previous) ?? false;
    }
    async linkQuery(options) {
        const { db, watchOptions } = this.options;
        const { abortSignal } = options;
        const compiledQuery = watchOptions.query.compile();
        const tables = await db.resolveTables(compiledQuery.sql, compiledQuery.parameters, {
            tables: options.settings.triggerOnTables
        });
        db.onChangeWithCallback({
            onChange: async () => {
                if (this.closed || abortSignal.aborted) {
                    return;
                }
                // This fires for each change of the relevant tables
                try {
                    if (this.reportFetching && !this.state.isFetching) {
                        await this.updateState({ isFetching: true });
                    }
                    const partialStateUpdate = {};
                    // Always run the query if an underlying table has changed
                    const result = await watchOptions.query.execute({
                        sql: compiledQuery.sql,
                        // Allows casting from ReadOnlyArray[unknown] to Array<unknown>
                        // This allows simpler compatibility with PowerSync queries
                        parameters: [...compiledQuery.parameters],
                        db: this.options.db
                    });
                    if (abortSignal.aborted) {
                        return;
                    }
                    if (this.reportFetching) {
                        partialStateUpdate.isFetching = false;
                    }
                    if (this.state.isLoading) {
                        partialStateUpdate.isLoading = false;
                    }
                    // Check if the result has changed
                    if (!this.checkEquality(result, this.state.data)) {
                        Object.assign(partialStateUpdate, {
                            data: result
                        });
                    }
                    if (this.state.error) {
                        partialStateUpdate.error = null;
                    }
                    if (Object.keys(partialStateUpdate).length > 0) {
                        await this.updateState(partialStateUpdate);
                    }
                }
                catch (error) {
                    await this.updateState({ error });
                }
            },
            onError: async (error) => {
                await this.updateState({ error });
            }
        }, {
            signal: abortSignal,
            tables,
            throttleMs: watchOptions.throttleMs,
            triggerImmediate: true // used to emit the initial state
        });
    }
}

/**
 * @internal
 */
class CustomQuery {
    options;
    constructor(options) {
        this.options = options;
    }
    resolveOptions(options) {
        return {
            reportFetching: options?.reportFetching ?? DEFAULT_WATCH_QUERY_OPTIONS.reportFetching,
            throttleMs: options?.throttleMs ?? DEFAULT_WATCH_QUERY_OPTIONS.throttleMs,
            triggerOnTables: options?.triggerOnTables
        };
    }
    watch(watchOptions) {
        return new OnChangeQueryProcessor({
            db: this.options.db,
            comparator: watchOptions?.comparator ?? FalsyComparator,
            placeholderData: watchOptions?.placeholderData ?? [],
            watchOptions: {
                ...this.resolveOptions(watchOptions),
                query: this.options.query
            }
        });
    }
    differentialWatch(differentialWatchOptions) {
        return new DifferentialQueryProcessor({
            db: this.options.db,
            rowComparator: differentialWatchOptions?.rowComparator,
            placeholderData: differentialWatchOptions?.placeholderData ?? [],
            watchOptions: {
                ...this.resolveOptions(differentialWatchOptions),
                query: this.options.query
            }
        });
    }
}

/**
 * Tests if the input is a {@link SQLOpenOptions}
 */
const isSQLOpenOptions = (test) => {
    // typeof null is `object`, but you cannot use the `in` operator on `null.
    return test && typeof test == 'object' && 'dbFilename' in test;
};
/**
 * Tests if input is a {@link SQLOpenFactory}
 */
const isSQLOpenFactory = (test) => {
    return typeof test?.openDB == 'function';
};
/**
 * Tests if input is a {@link DBAdapter}
 */
const isDBAdapter = (test) => {
    return typeof test?.writeTransaction == 'function';
};

var PSInternalTable;
(function (PSInternalTable) {
    PSInternalTable["DATA"] = "ps_data";
    PSInternalTable["CRUD"] = "ps_crud";
    PSInternalTable["BUCKETS"] = "ps_buckets";
    PSInternalTable["OPLOG"] = "ps_oplog";
    PSInternalTable["UNTYPED"] = "ps_untyped";
})(PSInternalTable || (PSInternalTable = {}));
var PowerSyncControlCommand;
(function (PowerSyncControlCommand) {
    PowerSyncControlCommand["PROCESS_TEXT_LINE"] = "line_text";
    PowerSyncControlCommand["PROCESS_BSON_LINE"] = "line_binary";
    PowerSyncControlCommand["STOP"] = "stop";
    PowerSyncControlCommand["START"] = "start";
    PowerSyncControlCommand["NOTIFY_TOKEN_REFRESHED"] = "refreshed_token";
    PowerSyncControlCommand["NOTIFY_CRUD_UPLOAD_COMPLETED"] = "completed_upload";
    PowerSyncControlCommand["UPDATE_SUBSCRIPTIONS"] = "update_subscriptions";
})(PowerSyncControlCommand || (PowerSyncControlCommand = {}));

/**
 * A batch of client-side changes.
 */
class CrudBatch {
    crud;
    haveMore;
    complete;
    constructor(
    /**
     * List of client-side changes.
     */
    crud, 
    /**
     * true if there are more changes in the local queue.
     */
    haveMore, 
    /**
     * Call to remove the changes from the local queue, once successfully uploaded.
     */
    complete) {
        this.crud = crud;
        this.haveMore = haveMore;
        this.complete = complete;
    }
}

/**
 * Type of local change.
 */
var UpdateType;
(function (UpdateType) {
    /** Insert or replace existing row. All non-null columns are included in the data. Generated by INSERT statements. */
    UpdateType["PUT"] = "PUT";
    /** Update existing row. Contains the id, and value of each changed column. Generated by UPDATE statements. */
    UpdateType["PATCH"] = "PATCH";
    /** Delete existing row. Contains the id. Generated by DELETE statements. */
    UpdateType["DELETE"] = "DELETE";
})(UpdateType || (UpdateType = {}));
/**
 * A single client-side change.
 */
class CrudEntry {
    /**
     * Auto-incrementing client-side id.
     */
    clientId;
    /**
     * ID of the changed row.
     */
    id;
    /**
     * Type of change.
     */
    op;
    /**
     * Data associated with the change.
     */
    opData;
    /**
     * For tables where the `trackPreviousValues` option has been enabled, this tracks previous values for
     * `UPDATE` and `DELETE` statements.
     */
    previousValues;
    /**
     * Table that contained the change.
     */
    table;
    /**
     * Auto-incrementing transaction id. This is the same for all operations within the same transaction.
     */
    transactionId;
    /**
     * Client-side metadata attached with this write.
     *
     * This field is only available when the `trackMetadata` option was set to `true` when creating a table
     * and the insert or update statement set the `_metadata` column.
     */
    metadata;
    static fromRow(dbRow) {
        const data = JSON.parse(dbRow.data);
        return new CrudEntry(parseInt(dbRow.id), data.op, data.type, data.id, dbRow.tx_id, data.data, data.old, data.metadata);
    }
    constructor(clientId, op, table, id, transactionId, opData, previousValues, metadata) {
        this.clientId = clientId;
        this.id = id;
        this.op = op;
        this.opData = opData;
        this.table = table;
        this.transactionId = transactionId;
        this.previousValues = previousValues;
        this.metadata = metadata;
    }
    /**
     * Converts the change to JSON format.
     */
    toJSON() {
        return {
            op_id: this.clientId,
            op: this.op,
            type: this.table,
            id: this.id,
            tx_id: this.transactionId,
            data: this.opData,
            old: this.previousValues,
            metadata: this.metadata
        };
    }
    equals(entry) {
        return JSON.stringify(this.toComparisonArray()) == JSON.stringify(entry.toComparisonArray());
    }
    /**
     * The hash code for this object.
     * @deprecated This should not be necessary in the JS SDK.
     * Use the  @see CrudEntry#equals method instead.
     * TODO remove in the next major release.
     */
    hashCode() {
        return JSON.stringify(this.toComparisonArray());
    }
    /**
     * Generates an array for use in deep comparison operations
     */
    toComparisonArray() {
        return [
            this.transactionId,
            this.clientId,
            this.op,
            this.table,
            this.id,
            this.opData,
            this.previousValues,
            this.metadata
        ];
    }
}

class CrudTransaction extends CrudBatch {
    crud;
    complete;
    transactionId;
    constructor(
    /**
     * List of client-side changes.
     */
    crud, 
    /**
     * Call to remove the changes from the local queue, once successfully uploaded.
     */
    complete, 
    /**
     * If null, this contains a list of changes recorded without an explicit transaction associated.
     */
    transactionId) {
        super(crud, false, complete);
        this.crud = crud;
        this.complete = complete;
        this.transactionId = transactionId;
    }
}

/**
 * Calls to Abortcontroller.abort(reason: any) will result in the
 * `reason` being thrown. This is not necessarily an error,
 *  but extends error for better logging purposes.
 */
class AbortOperation extends Error {
    reason;
    constructor(reason) {
        super(reason);
        this.reason = reason;
        // Set the prototype explicitly
        Object.setPrototypeOf(this, AbortOperation.prototype);
        // Capture stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AbortOperation);
        }
    }
}

var OpTypeEnum;
(function (OpTypeEnum) {
    OpTypeEnum[OpTypeEnum["CLEAR"] = 1] = "CLEAR";
    OpTypeEnum[OpTypeEnum["MOVE"] = 2] = "MOVE";
    OpTypeEnum[OpTypeEnum["PUT"] = 3] = "PUT";
    OpTypeEnum[OpTypeEnum["REMOVE"] = 4] = "REMOVE";
})(OpTypeEnum || (OpTypeEnum = {}));
/**
 * Used internally for sync buckets.
 */
class OpType {
    value;
    static fromJSON(jsonValue) {
        return new OpType(OpTypeEnum[jsonValue]);
    }
    constructor(value) {
        this.value = value;
    }
    toJSON() {
        return Object.entries(OpTypeEnum).find(([, value]) => value === this.value)[0];
    }
}

class OplogEntry {
    op_id;
    op;
    checksum;
    subkey;
    object_type;
    object_id;
    data;
    static fromRow(row) {
        return new OplogEntry(row.op_id, OpType.fromJSON(row.op), row.checksum, row.subkey, row.object_type, row.object_id, row.data);
    }
    constructor(op_id, op, checksum, subkey, object_type, object_id, data) {
        this.op_id = op_id;
        this.op = op;
        this.checksum = checksum;
        this.subkey = subkey;
        this.object_type = object_type;
        this.object_id = object_id;
        this.data = data;
    }
    toJSON(fixedKeyEncoding = false) {
        return {
            op_id: this.op_id,
            op: this.op.toJSON(),
            object_type: this.object_type,
            object_id: this.object_id,
            checksum: this.checksum,
            data: this.data,
            // Older versions of the JS SDK used to always JSON.stringify here. That has always been wrong,
            // but we need to migrate gradually to not break existing databases.
            subkey: fixedKeyEncoding ? this.subkey : JSON.stringify(this.subkey)
        };
    }
}

class SyncDataBucket {
    bucket;
    data;
    has_more;
    after;
    next_after;
    static fromRow(row) {
        return new SyncDataBucket(row.bucket, row.data.map((entry) => OplogEntry.fromRow(entry)), row.has_more ?? false, row.after, row.next_after);
    }
    constructor(bucket, data, 
    /**
     * True if the response does not contain all the data for this bucket, and another request must be made.
     */
    has_more, 
    /**
     * The `after` specified in the request.
     */
    after, 
    /**
     * Use this for the next request.
     */
    next_after) {
        this.bucket = bucket;
        this.data = data;
        this.has_more = has_more;
        this.after = after;
        this.next_after = next_after;
    }
    toJSON(fixedKeyEncoding = false) {
        return {
            bucket: this.bucket,
            has_more: this.has_more,
            after: this.after,
            next_after: this.next_after,
            data: this.data.map((entry) => entry.toJSON(fixedKeyEncoding))
        };
    }
}

var buffer$1 = {};

var base64Js = {};

var hasRequiredBase64Js;

function requireBase64Js () {
	if (hasRequiredBase64Js) return base64Js;
	hasRequiredBase64Js = 1;

	base64Js.byteLength = byteLength;
	base64Js.toByteArray = toByteArray;
	base64Js.fromByteArray = fromByteArray;

	var lookup = [];
	var revLookup = [];
	var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;

	var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	for (var i = 0, len = code.length; i < len; ++i) {
	  lookup[i] = code[i];
	  revLookup[code.charCodeAt(i)] = i;
	}

	// Support decoding URL-safe base64 strings, as Node.js does.
	// See: https://en.wikipedia.org/wiki/Base64#URL_applications
	revLookup['-'.charCodeAt(0)] = 62;
	revLookup['_'.charCodeAt(0)] = 63;

	function getLens (b64) {
	  var len = b64.length;

	  if (len % 4 > 0) {
	    throw new Error('Invalid string. Length must be a multiple of 4')
	  }

	  // Trim off extra bytes after placeholder bytes are found
	  // See: https://github.com/beatgammit/base64-js/issues/42
	  var validLen = b64.indexOf('=');
	  if (validLen === -1) validLen = len;

	  var placeHoldersLen = validLen === len
	    ? 0
	    : 4 - (validLen % 4);

	  return [validLen, placeHoldersLen]
	}

	// base64 is 4/3 + up to two characters of the original data
	function byteLength (b64) {
	  var lens = getLens(b64);
	  var validLen = lens[0];
	  var placeHoldersLen = lens[1];
	  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
	}

	function _byteLength (b64, validLen, placeHoldersLen) {
	  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
	}

	function toByteArray (b64) {
	  var tmp;
	  var lens = getLens(b64);
	  var validLen = lens[0];
	  var placeHoldersLen = lens[1];

	  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));

	  var curByte = 0;

	  // if there are placeholders, only get up to the last complete 4 chars
	  var len = placeHoldersLen > 0
	    ? validLen - 4
	    : validLen;

	  var i;
	  for (i = 0; i < len; i += 4) {
	    tmp =
	      (revLookup[b64.charCodeAt(i)] << 18) |
	      (revLookup[b64.charCodeAt(i + 1)] << 12) |
	      (revLookup[b64.charCodeAt(i + 2)] << 6) |
	      revLookup[b64.charCodeAt(i + 3)];
	    arr[curByte++] = (tmp >> 16) & 0xFF;
	    arr[curByte++] = (tmp >> 8) & 0xFF;
	    arr[curByte++] = tmp & 0xFF;
	  }

	  if (placeHoldersLen === 2) {
	    tmp =
	      (revLookup[b64.charCodeAt(i)] << 2) |
	      (revLookup[b64.charCodeAt(i + 1)] >> 4);
	    arr[curByte++] = tmp & 0xFF;
	  }

	  if (placeHoldersLen === 1) {
	    tmp =
	      (revLookup[b64.charCodeAt(i)] << 10) |
	      (revLookup[b64.charCodeAt(i + 1)] << 4) |
	      (revLookup[b64.charCodeAt(i + 2)] >> 2);
	    arr[curByte++] = (tmp >> 8) & 0xFF;
	    arr[curByte++] = tmp & 0xFF;
	  }

	  return arr
	}

	function tripletToBase64 (num) {
	  return lookup[num >> 18 & 0x3F] +
	    lookup[num >> 12 & 0x3F] +
	    lookup[num >> 6 & 0x3F] +
	    lookup[num & 0x3F]
	}

	function encodeChunk (uint8, start, end) {
	  var tmp;
	  var output = [];
	  for (var i = start; i < end; i += 3) {
	    tmp =
	      ((uint8[i] << 16) & 0xFF0000) +
	      ((uint8[i + 1] << 8) & 0xFF00) +
	      (uint8[i + 2] & 0xFF);
	    output.push(tripletToBase64(tmp));
	  }
	  return output.join('')
	}

	function fromByteArray (uint8) {
	  var tmp;
	  var len = uint8.length;
	  var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
	  var parts = [];
	  var maxChunkLength = 16383; // must be multiple of 3

	  // go through the array every three bytes, we'll deal with trailing stuff later
	  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
	    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
	  }

	  // pad the end with zeros, but make sure to not forget the extra bytes
	  if (extraBytes === 1) {
	    tmp = uint8[len - 1];
	    parts.push(
	      lookup[tmp >> 2] +
	      lookup[(tmp << 4) & 0x3F] +
	      '=='
	    );
	  } else if (extraBytes === 2) {
	    tmp = (uint8[len - 2] << 8) + uint8[len - 1];
	    parts.push(
	      lookup[tmp >> 10] +
	      lookup[(tmp >> 4) & 0x3F] +
	      lookup[(tmp << 2) & 0x3F] +
	      '='
	    );
	  }

	  return parts.join('')
	}
	return base64Js;
}

var ieee754 = {};

/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */

var hasRequiredIeee754;

function requireIeee754 () {
	if (hasRequiredIeee754) return ieee754;
	hasRequiredIeee754 = 1;
	ieee754.read = function (buffer, offset, isLE, mLen, nBytes) {
	  var e, m;
	  var eLen = (nBytes * 8) - mLen - 1;
	  var eMax = (1 << eLen) - 1;
	  var eBias = eMax >> 1;
	  var nBits = -7;
	  var i = isLE ? (nBytes - 1) : 0;
	  var d = isLE ? -1 : 1;
	  var s = buffer[offset + i];

	  i += d;

	  e = s & ((1 << (-nBits)) - 1);
	  s >>= (-nBits);
	  nBits += eLen;
	  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

	  m = e & ((1 << (-nBits)) - 1);
	  e >>= (-nBits);
	  nBits += mLen;
	  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

	  if (e === 0) {
	    e = 1 - eBias;
	  } else if (e === eMax) {
	    return m ? NaN : ((s ? -1 : 1) * Infinity)
	  } else {
	    m = m + Math.pow(2, mLen);
	    e = e - eBias;
	  }
	  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
	};

	ieee754.write = function (buffer, value, offset, isLE, mLen, nBytes) {
	  var e, m, c;
	  var eLen = (nBytes * 8) - mLen - 1;
	  var eMax = (1 << eLen) - 1;
	  var eBias = eMax >> 1;
	  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
	  var i = isLE ? 0 : (nBytes - 1);
	  var d = isLE ? 1 : -1;
	  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

	  value = Math.abs(value);

	  if (isNaN(value) || value === Infinity) {
	    m = isNaN(value) ? 1 : 0;
	    e = eMax;
	  } else {
	    e = Math.floor(Math.log(value) / Math.LN2);
	    if (value * (c = Math.pow(2, -e)) < 1) {
	      e--;
	      c *= 2;
	    }
	    if (e + eBias >= 1) {
	      value += rt / c;
	    } else {
	      value += rt * Math.pow(2, 1 - eBias);
	    }
	    if (value * c >= 2) {
	      e++;
	      c /= 2;
	    }

	    if (e + eBias >= eMax) {
	      m = 0;
	      e = eMax;
	    } else if (e + eBias >= 1) {
	      m = ((value * c) - 1) * Math.pow(2, mLen);
	      e = e + eBias;
	    } else {
	      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
	      e = 0;
	    }
	  }

	  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

	  e = (e << mLen) | m;
	  eLen += mLen;
	  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

	  buffer[offset + i - d] |= s * 128;
	};
	return ieee754;
}

/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

var hasRequiredBuffer$1;

function requireBuffer$1 () {
	if (hasRequiredBuffer$1) return buffer$1;
	hasRequiredBuffer$1 = 1;
	(function (exports$1) {

		const base64 = requireBase64Js();
		const ieee754 = requireIeee754();
		const customInspectSymbol =
		  (typeof Symbol === 'function' && typeof Symbol['for'] === 'function') // eslint-disable-line dot-notation
		    ? Symbol['for']('nodejs.util.inspect.custom') // eslint-disable-line dot-notation
		    : null;

		exports$1.Buffer = Buffer;
		exports$1.SlowBuffer = SlowBuffer;
		exports$1.INSPECT_MAX_BYTES = 50;

		const K_MAX_LENGTH = 0x7fffffff;
		exports$1.kMaxLength = K_MAX_LENGTH;

		/**
		 * If `Buffer.TYPED_ARRAY_SUPPORT`:
		 *   === true    Use Uint8Array implementation (fastest)
		 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
		 *               implementation (most compatible, even IE6)
		 *
		 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
		 * Opera 11.6+, iOS 4.2+.
		 *
		 * We report that the browser does not support typed arrays if the are not subclassable
		 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
		 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
		 * for __proto__ and has a buggy typed array implementation.
		 */
		Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport();

		if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
		    typeof console.error === 'function') {
		  console.error(
		    'This browser lacks typed array (Uint8Array) support which is required by ' +
		    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
		  );
		}

		function typedArraySupport () {
		  // Can typed array instances can be augmented?
		  try {
		    const arr = new Uint8Array(1);
		    const proto = { foo: function () { return 42 } };
		    Object.setPrototypeOf(proto, Uint8Array.prototype);
		    Object.setPrototypeOf(arr, proto);
		    return arr.foo() === 42
		  } catch (e) {
		    return false
		  }
		}

		Object.defineProperty(Buffer.prototype, 'parent', {
		  enumerable: true,
		  get: function () {
		    if (!Buffer.isBuffer(this)) return undefined
		    return this.buffer
		  }
		});

		Object.defineProperty(Buffer.prototype, 'offset', {
		  enumerable: true,
		  get: function () {
		    if (!Buffer.isBuffer(this)) return undefined
		    return this.byteOffset
		  }
		});

		function createBuffer (length) {
		  if (length > K_MAX_LENGTH) {
		    throw new RangeError('The value "' + length + '" is invalid for option "size"')
		  }
		  // Return an augmented `Uint8Array` instance
		  const buf = new Uint8Array(length);
		  Object.setPrototypeOf(buf, Buffer.prototype);
		  return buf
		}

		/**
		 * The Buffer constructor returns instances of `Uint8Array` that have their
		 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
		 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
		 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
		 * returns a single octet.
		 *
		 * The `Uint8Array` prototype remains unmodified.
		 */

		function Buffer (arg, encodingOrOffset, length) {
		  // Common case.
		  if (typeof arg === 'number') {
		    if (typeof encodingOrOffset === 'string') {
		      throw new TypeError(
		        'The "string" argument must be of type string. Received type number'
		      )
		    }
		    return allocUnsafe(arg)
		  }
		  return from(arg, encodingOrOffset, length)
		}

		Buffer.poolSize = 8192; // not used by this implementation

		function from (value, encodingOrOffset, length) {
		  if (typeof value === 'string') {
		    return fromString(value, encodingOrOffset)
		  }

		  if (ArrayBuffer.isView(value)) {
		    return fromArrayView(value)
		  }

		  if (value == null) {
		    throw new TypeError(
		      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
		      'or Array-like Object. Received type ' + (typeof value)
		    )
		  }

		  if (isInstance(value, ArrayBuffer) ||
		      (value && isInstance(value.buffer, ArrayBuffer))) {
		    return fromArrayBuffer(value, encodingOrOffset, length)
		  }

		  if (typeof SharedArrayBuffer !== 'undefined' &&
		      (isInstance(value, SharedArrayBuffer) ||
		      (value && isInstance(value.buffer, SharedArrayBuffer)))) {
		    return fromArrayBuffer(value, encodingOrOffset, length)
		  }

		  if (typeof value === 'number') {
		    throw new TypeError(
		      'The "value" argument must not be of type number. Received type number'
		    )
		  }

		  const valueOf = value.valueOf && value.valueOf();
		  if (valueOf != null && valueOf !== value) {
		    return Buffer.from(valueOf, encodingOrOffset, length)
		  }

		  const b = fromObject(value);
		  if (b) return b

		  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
		      typeof value[Symbol.toPrimitive] === 'function') {
		    return Buffer.from(value[Symbol.toPrimitive]('string'), encodingOrOffset, length)
		  }

		  throw new TypeError(
		    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
		    'or Array-like Object. Received type ' + (typeof value)
		  )
		}

		/**
		 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
		 * if value is a number.
		 * Buffer.from(str[, encoding])
		 * Buffer.from(array)
		 * Buffer.from(buffer)
		 * Buffer.from(arrayBuffer[, byteOffset[, length]])
		 **/
		Buffer.from = function (value, encodingOrOffset, length) {
		  return from(value, encodingOrOffset, length)
		};

		// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
		// https://github.com/feross/buffer/pull/148
		Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype);
		Object.setPrototypeOf(Buffer, Uint8Array);

		function assertSize (size) {
		  if (typeof size !== 'number') {
		    throw new TypeError('"size" argument must be of type number')
		  } else if (size < 0) {
		    throw new RangeError('The value "' + size + '" is invalid for option "size"')
		  }
		}

		function alloc (size, fill, encoding) {
		  assertSize(size);
		  if (size <= 0) {
		    return createBuffer(size)
		  }
		  if (fill !== undefined) {
		    // Only pay attention to encoding if it's a string. This
		    // prevents accidentally sending in a number that would
		    // be interpreted as a start offset.
		    return typeof encoding === 'string'
		      ? createBuffer(size).fill(fill, encoding)
		      : createBuffer(size).fill(fill)
		  }
		  return createBuffer(size)
		}

		/**
		 * Creates a new filled Buffer instance.
		 * alloc(size[, fill[, encoding]])
		 **/
		Buffer.alloc = function (size, fill, encoding) {
		  return alloc(size, fill, encoding)
		};

		function allocUnsafe (size) {
		  assertSize(size);
		  return createBuffer(size < 0 ? 0 : checked(size) | 0)
		}

		/**
		 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
		 * */
		Buffer.allocUnsafe = function (size) {
		  return allocUnsafe(size)
		};
		/**
		 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
		 */
		Buffer.allocUnsafeSlow = function (size) {
		  return allocUnsafe(size)
		};

		function fromString (string, encoding) {
		  if (typeof encoding !== 'string' || encoding === '') {
		    encoding = 'utf8';
		  }

		  if (!Buffer.isEncoding(encoding)) {
		    throw new TypeError('Unknown encoding: ' + encoding)
		  }

		  const length = byteLength(string, encoding) | 0;
		  let buf = createBuffer(length);

		  const actual = buf.write(string, encoding);

		  if (actual !== length) {
		    // Writing a hex string, for example, that contains invalid characters will
		    // cause everything after the first invalid character to be ignored. (e.g.
		    // 'abxxcd' will be treated as 'ab')
		    buf = buf.slice(0, actual);
		  }

		  return buf
		}

		function fromArrayLike (array) {
		  const length = array.length < 0 ? 0 : checked(array.length) | 0;
		  const buf = createBuffer(length);
		  for (let i = 0; i < length; i += 1) {
		    buf[i] = array[i] & 255;
		  }
		  return buf
		}

		function fromArrayView (arrayView) {
		  if (isInstance(arrayView, Uint8Array)) {
		    const copy = new Uint8Array(arrayView);
		    return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength)
		  }
		  return fromArrayLike(arrayView)
		}

		function fromArrayBuffer (array, byteOffset, length) {
		  if (byteOffset < 0 || array.byteLength < byteOffset) {
		    throw new RangeError('"offset" is outside of buffer bounds')
		  }

		  if (array.byteLength < byteOffset + (length || 0)) {
		    throw new RangeError('"length" is outside of buffer bounds')
		  }

		  let buf;
		  if (byteOffset === undefined && length === undefined) {
		    buf = new Uint8Array(array);
		  } else if (length === undefined) {
		    buf = new Uint8Array(array, byteOffset);
		  } else {
		    buf = new Uint8Array(array, byteOffset, length);
		  }

		  // Return an augmented `Uint8Array` instance
		  Object.setPrototypeOf(buf, Buffer.prototype);

		  return buf
		}

		function fromObject (obj) {
		  if (Buffer.isBuffer(obj)) {
		    const len = checked(obj.length) | 0;
		    const buf = createBuffer(len);

		    if (buf.length === 0) {
		      return buf
		    }

		    obj.copy(buf, 0, 0, len);
		    return buf
		  }

		  if (obj.length !== undefined) {
		    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
		      return createBuffer(0)
		    }
		    return fromArrayLike(obj)
		  }

		  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
		    return fromArrayLike(obj.data)
		  }
		}

		function checked (length) {
		  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
		  // length is NaN (which is otherwise coerced to zero.)
		  if (length >= K_MAX_LENGTH) {
		    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
		                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
		  }
		  return length | 0
		}

		function SlowBuffer (length) {
		  if (+length != length) { // eslint-disable-line eqeqeq
		    length = 0;
		  }
		  return Buffer.alloc(+length)
		}

		Buffer.isBuffer = function isBuffer (b) {
		  return b != null && b._isBuffer === true &&
		    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
		};

		Buffer.compare = function compare (a, b) {
		  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength);
		  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength);
		  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
		    throw new TypeError(
		      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
		    )
		  }

		  if (a === b) return 0

		  let x = a.length;
		  let y = b.length;

		  for (let i = 0, len = Math.min(x, y); i < len; ++i) {
		    if (a[i] !== b[i]) {
		      x = a[i];
		      y = b[i];
		      break
		    }
		  }

		  if (x < y) return -1
		  if (y < x) return 1
		  return 0
		};

		Buffer.isEncoding = function isEncoding (encoding) {
		  switch (String(encoding).toLowerCase()) {
		    case 'hex':
		    case 'utf8':
		    case 'utf-8':
		    case 'ascii':
		    case 'latin1':
		    case 'binary':
		    case 'base64':
		    case 'ucs2':
		    case 'ucs-2':
		    case 'utf16le':
		    case 'utf-16le':
		      return true
		    default:
		      return false
		  }
		};

		Buffer.concat = function concat (list, length) {
		  if (!Array.isArray(list)) {
		    throw new TypeError('"list" argument must be an Array of Buffers')
		  }

		  if (list.length === 0) {
		    return Buffer.alloc(0)
		  }

		  let i;
		  if (length === undefined) {
		    length = 0;
		    for (i = 0; i < list.length; ++i) {
		      length += list[i].length;
		    }
		  }

		  const buffer = Buffer.allocUnsafe(length);
		  let pos = 0;
		  for (i = 0; i < list.length; ++i) {
		    let buf = list[i];
		    if (isInstance(buf, Uint8Array)) {
		      if (pos + buf.length > buffer.length) {
		        if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
		        buf.copy(buffer, pos);
		      } else {
		        Uint8Array.prototype.set.call(
		          buffer,
		          buf,
		          pos
		        );
		      }
		    } else if (!Buffer.isBuffer(buf)) {
		      throw new TypeError('"list" argument must be an Array of Buffers')
		    } else {
		      buf.copy(buffer, pos);
		    }
		    pos += buf.length;
		  }
		  return buffer
		};

		function byteLength (string, encoding) {
		  if (Buffer.isBuffer(string)) {
		    return string.length
		  }
		  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
		    return string.byteLength
		  }
		  if (typeof string !== 'string') {
		    throw new TypeError(
		      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
		      'Received type ' + typeof string
		    )
		  }

		  const len = string.length;
		  const mustMatch = (arguments.length > 2 && arguments[2] === true);
		  if (!mustMatch && len === 0) return 0

		  // Use a for loop to avoid recursion
		  let loweredCase = false;
		  for (;;) {
		    switch (encoding) {
		      case 'ascii':
		      case 'latin1':
		      case 'binary':
		        return len
		      case 'utf8':
		      case 'utf-8':
		        return utf8ToBytes(string).length
		      case 'ucs2':
		      case 'ucs-2':
		      case 'utf16le':
		      case 'utf-16le':
		        return len * 2
		      case 'hex':
		        return len >>> 1
		      case 'base64':
		        return base64ToBytes(string).length
		      default:
		        if (loweredCase) {
		          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
		        }
		        encoding = ('' + encoding).toLowerCase();
		        loweredCase = true;
		    }
		  }
		}
		Buffer.byteLength = byteLength;

		function slowToString (encoding, start, end) {
		  let loweredCase = false;

		  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
		  // property of a typed array.

		  // This behaves neither like String nor Uint8Array in that we set start/end
		  // to their upper/lower bounds if the value passed is out of range.
		  // undefined is handled specially as per ECMA-262 6th Edition,
		  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
		  if (start === undefined || start < 0) {
		    start = 0;
		  }
		  // Return early if start > this.length. Done here to prevent potential uint32
		  // coercion fail below.
		  if (start > this.length) {
		    return ''
		  }

		  if (end === undefined || end > this.length) {
		    end = this.length;
		  }

		  if (end <= 0) {
		    return ''
		  }

		  // Force coercion to uint32. This will also coerce falsey/NaN values to 0.
		  end >>>= 0;
		  start >>>= 0;

		  if (end <= start) {
		    return ''
		  }

		  if (!encoding) encoding = 'utf8';

		  while (true) {
		    switch (encoding) {
		      case 'hex':
		        return hexSlice(this, start, end)

		      case 'utf8':
		      case 'utf-8':
		        return utf8Slice(this, start, end)

		      case 'ascii':
		        return asciiSlice(this, start, end)

		      case 'latin1':
		      case 'binary':
		        return latin1Slice(this, start, end)

		      case 'base64':
		        return base64Slice(this, start, end)

		      case 'ucs2':
		      case 'ucs-2':
		      case 'utf16le':
		      case 'utf-16le':
		        return utf16leSlice(this, start, end)

		      default:
		        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
		        encoding = (encoding + '').toLowerCase();
		        loweredCase = true;
		    }
		  }
		}

		// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
		// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
		// reliably in a browserify context because there could be multiple different
		// copies of the 'buffer' package in use. This method works even for Buffer
		// instances that were created from another copy of the `buffer` package.
		// See: https://github.com/feross/buffer/issues/154
		Buffer.prototype._isBuffer = true;

		function swap (b, n, m) {
		  const i = b[n];
		  b[n] = b[m];
		  b[m] = i;
		}

		Buffer.prototype.swap16 = function swap16 () {
		  const len = this.length;
		  if (len % 2 !== 0) {
		    throw new RangeError('Buffer size must be a multiple of 16-bits')
		  }
		  for (let i = 0; i < len; i += 2) {
		    swap(this, i, i + 1);
		  }
		  return this
		};

		Buffer.prototype.swap32 = function swap32 () {
		  const len = this.length;
		  if (len % 4 !== 0) {
		    throw new RangeError('Buffer size must be a multiple of 32-bits')
		  }
		  for (let i = 0; i < len; i += 4) {
		    swap(this, i, i + 3);
		    swap(this, i + 1, i + 2);
		  }
		  return this
		};

		Buffer.prototype.swap64 = function swap64 () {
		  const len = this.length;
		  if (len % 8 !== 0) {
		    throw new RangeError('Buffer size must be a multiple of 64-bits')
		  }
		  for (let i = 0; i < len; i += 8) {
		    swap(this, i, i + 7);
		    swap(this, i + 1, i + 6);
		    swap(this, i + 2, i + 5);
		    swap(this, i + 3, i + 4);
		  }
		  return this
		};

		Buffer.prototype.toString = function toString () {
		  const length = this.length;
		  if (length === 0) return ''
		  if (arguments.length === 0) return utf8Slice(this, 0, length)
		  return slowToString.apply(this, arguments)
		};

		Buffer.prototype.toLocaleString = Buffer.prototype.toString;

		Buffer.prototype.equals = function equals (b) {
		  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
		  if (this === b) return true
		  return Buffer.compare(this, b) === 0
		};

		Buffer.prototype.inspect = function inspect () {
		  let str = '';
		  const max = exports$1.INSPECT_MAX_BYTES;
		  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim();
		  if (this.length > max) str += ' ... ';
		  return '<Buffer ' + str + '>'
		};
		if (customInspectSymbol) {
		  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect;
		}

		Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
		  if (isInstance(target, Uint8Array)) {
		    target = Buffer.from(target, target.offset, target.byteLength);
		  }
		  if (!Buffer.isBuffer(target)) {
		    throw new TypeError(
		      'The "target" argument must be one of type Buffer or Uint8Array. ' +
		      'Received type ' + (typeof target)
		    )
		  }

		  if (start === undefined) {
		    start = 0;
		  }
		  if (end === undefined) {
		    end = target ? target.length : 0;
		  }
		  if (thisStart === undefined) {
		    thisStart = 0;
		  }
		  if (thisEnd === undefined) {
		    thisEnd = this.length;
		  }

		  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
		    throw new RangeError('out of range index')
		  }

		  if (thisStart >= thisEnd && start >= end) {
		    return 0
		  }
		  if (thisStart >= thisEnd) {
		    return -1
		  }
		  if (start >= end) {
		    return 1
		  }

		  start >>>= 0;
		  end >>>= 0;
		  thisStart >>>= 0;
		  thisEnd >>>= 0;

		  if (this === target) return 0

		  let x = thisEnd - thisStart;
		  let y = end - start;
		  const len = Math.min(x, y);

		  const thisCopy = this.slice(thisStart, thisEnd);
		  const targetCopy = target.slice(start, end);

		  for (let i = 0; i < len; ++i) {
		    if (thisCopy[i] !== targetCopy[i]) {
		      x = thisCopy[i];
		      y = targetCopy[i];
		      break
		    }
		  }

		  if (x < y) return -1
		  if (y < x) return 1
		  return 0
		};

		// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
		// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
		//
		// Arguments:
		// - buffer - a Buffer to search
		// - val - a string, Buffer, or number
		// - byteOffset - an index into `buffer`; will be clamped to an int32
		// - encoding - an optional encoding, relevant is val is a string
		// - dir - true for indexOf, false for lastIndexOf
		function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
		  // Empty buffer means no match
		  if (buffer.length === 0) return -1

		  // Normalize byteOffset
		  if (typeof byteOffset === 'string') {
		    encoding = byteOffset;
		    byteOffset = 0;
		  } else if (byteOffset > 0x7fffffff) {
		    byteOffset = 0x7fffffff;
		  } else if (byteOffset < -2147483648) {
		    byteOffset = -2147483648;
		  }
		  byteOffset = +byteOffset; // Coerce to Number.
		  if (numberIsNaN(byteOffset)) {
		    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
		    byteOffset = dir ? 0 : (buffer.length - 1);
		  }

		  // Normalize byteOffset: negative offsets start from the end of the buffer
		  if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
		  if (byteOffset >= buffer.length) {
		    if (dir) return -1
		    else byteOffset = buffer.length - 1;
		  } else if (byteOffset < 0) {
		    if (dir) byteOffset = 0;
		    else return -1
		  }

		  // Normalize val
		  if (typeof val === 'string') {
		    val = Buffer.from(val, encoding);
		  }

		  // Finally, search either indexOf (if dir is true) or lastIndexOf
		  if (Buffer.isBuffer(val)) {
		    // Special case: looking for empty string/buffer always fails
		    if (val.length === 0) {
		      return -1
		    }
		    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
		  } else if (typeof val === 'number') {
		    val = val & 0xFF; // Search for a byte value [0-255]
		    if (typeof Uint8Array.prototype.indexOf === 'function') {
		      if (dir) {
		        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
		      } else {
		        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
		      }
		    }
		    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
		  }

		  throw new TypeError('val must be string, number or Buffer')
		}

		function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
		  let indexSize = 1;
		  let arrLength = arr.length;
		  let valLength = val.length;

		  if (encoding !== undefined) {
		    encoding = String(encoding).toLowerCase();
		    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
		        encoding === 'utf16le' || encoding === 'utf-16le') {
		      if (arr.length < 2 || val.length < 2) {
		        return -1
		      }
		      indexSize = 2;
		      arrLength /= 2;
		      valLength /= 2;
		      byteOffset /= 2;
		    }
		  }

		  function read (buf, i) {
		    if (indexSize === 1) {
		      return buf[i]
		    } else {
		      return buf.readUInt16BE(i * indexSize)
		    }
		  }

		  let i;
		  if (dir) {
		    let foundIndex = -1;
		    for (i = byteOffset; i < arrLength; i++) {
		      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
		        if (foundIndex === -1) foundIndex = i;
		        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
		      } else {
		        if (foundIndex !== -1) i -= i - foundIndex;
		        foundIndex = -1;
		      }
		    }
		  } else {
		    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
		    for (i = byteOffset; i >= 0; i--) {
		      let found = true;
		      for (let j = 0; j < valLength; j++) {
		        if (read(arr, i + j) !== read(val, j)) {
		          found = false;
		          break
		        }
		      }
		      if (found) return i
		    }
		  }

		  return -1
		}

		Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
		  return this.indexOf(val, byteOffset, encoding) !== -1
		};

		Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
		  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
		};

		Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
		  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
		};

		function hexWrite (buf, string, offset, length) {
		  offset = Number(offset) || 0;
		  const remaining = buf.length - offset;
		  if (!length) {
		    length = remaining;
		  } else {
		    length = Number(length);
		    if (length > remaining) {
		      length = remaining;
		    }
		  }

		  const strLen = string.length;

		  if (length > strLen / 2) {
		    length = strLen / 2;
		  }
		  let i;
		  for (i = 0; i < length; ++i) {
		    const parsed = parseInt(string.substr(i * 2, 2), 16);
		    if (numberIsNaN(parsed)) return i
		    buf[offset + i] = parsed;
		  }
		  return i
		}

		function utf8Write (buf, string, offset, length) {
		  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
		}

		function asciiWrite (buf, string, offset, length) {
		  return blitBuffer(asciiToBytes(string), buf, offset, length)
		}

		function base64Write (buf, string, offset, length) {
		  return blitBuffer(base64ToBytes(string), buf, offset, length)
		}

		function ucs2Write (buf, string, offset, length) {
		  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
		}

		Buffer.prototype.write = function write (string, offset, length, encoding) {
		  // Buffer#write(string)
		  if (offset === undefined) {
		    encoding = 'utf8';
		    length = this.length;
		    offset = 0;
		  // Buffer#write(string, encoding)
		  } else if (length === undefined && typeof offset === 'string') {
		    encoding = offset;
		    length = this.length;
		    offset = 0;
		  // Buffer#write(string, offset[, length][, encoding])
		  } else if (isFinite(offset)) {
		    offset = offset >>> 0;
		    if (isFinite(length)) {
		      length = length >>> 0;
		      if (encoding === undefined) encoding = 'utf8';
		    } else {
		      encoding = length;
		      length = undefined;
		    }
		  } else {
		    throw new Error(
		      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
		    )
		  }

		  const remaining = this.length - offset;
		  if (length === undefined || length > remaining) length = remaining;

		  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
		    throw new RangeError('Attempt to write outside buffer bounds')
		  }

		  if (!encoding) encoding = 'utf8';

		  let loweredCase = false;
		  for (;;) {
		    switch (encoding) {
		      case 'hex':
		        return hexWrite(this, string, offset, length)

		      case 'utf8':
		      case 'utf-8':
		        return utf8Write(this, string, offset, length)

		      case 'ascii':
		      case 'latin1':
		      case 'binary':
		        return asciiWrite(this, string, offset, length)

		      case 'base64':
		        // Warning: maxLength not taken into account in base64Write
		        return base64Write(this, string, offset, length)

		      case 'ucs2':
		      case 'ucs-2':
		      case 'utf16le':
		      case 'utf-16le':
		        return ucs2Write(this, string, offset, length)

		      default:
		        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
		        encoding = ('' + encoding).toLowerCase();
		        loweredCase = true;
		    }
		  }
		};

		Buffer.prototype.toJSON = function toJSON () {
		  return {
		    type: 'Buffer',
		    data: Array.prototype.slice.call(this._arr || this, 0)
		  }
		};

		function base64Slice (buf, start, end) {
		  if (start === 0 && end === buf.length) {
		    return base64.fromByteArray(buf)
		  } else {
		    return base64.fromByteArray(buf.slice(start, end))
		  }
		}

		function utf8Slice (buf, start, end) {
		  end = Math.min(buf.length, end);
		  const res = [];

		  let i = start;
		  while (i < end) {
		    const firstByte = buf[i];
		    let codePoint = null;
		    let bytesPerSequence = (firstByte > 0xEF)
		      ? 4
		      : (firstByte > 0xDF)
		          ? 3
		          : (firstByte > 0xBF)
		              ? 2
		              : 1;

		    if (i + bytesPerSequence <= end) {
		      let secondByte, thirdByte, fourthByte, tempCodePoint;

		      switch (bytesPerSequence) {
		        case 1:
		          if (firstByte < 0x80) {
		            codePoint = firstByte;
		          }
		          break
		        case 2:
		          secondByte = buf[i + 1];
		          if ((secondByte & 0xC0) === 0x80) {
		            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
		            if (tempCodePoint > 0x7F) {
		              codePoint = tempCodePoint;
		            }
		          }
		          break
		        case 3:
		          secondByte = buf[i + 1];
		          thirdByte = buf[i + 2];
		          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
		            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
		            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
		              codePoint = tempCodePoint;
		            }
		          }
		          break
		        case 4:
		          secondByte = buf[i + 1];
		          thirdByte = buf[i + 2];
		          fourthByte = buf[i + 3];
		          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
		            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
		            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
		              codePoint = tempCodePoint;
		            }
		          }
		      }
		    }

		    if (codePoint === null) {
		      // we did not generate a valid codePoint so insert a
		      // replacement char (U+FFFD) and advance only 1 byte
		      codePoint = 0xFFFD;
		      bytesPerSequence = 1;
		    } else if (codePoint > 0xFFFF) {
		      // encode to utf16 (surrogate pair dance)
		      codePoint -= 0x10000;
		      res.push(codePoint >>> 10 & 0x3FF | 0xD800);
		      codePoint = 0xDC00 | codePoint & 0x3FF;
		    }

		    res.push(codePoint);
		    i += bytesPerSequence;
		  }

		  return decodeCodePointsArray(res)
		}

		// Based on http://stackoverflow.com/a/22747272/680742, the browser with
		// the lowest limit is Chrome, with 0x10000 args.
		// We go 1 magnitude less, for safety
		const MAX_ARGUMENTS_LENGTH = 0x1000;

		function decodeCodePointsArray (codePoints) {
		  const len = codePoints.length;
		  if (len <= MAX_ARGUMENTS_LENGTH) {
		    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
		  }

		  // Decode in chunks to avoid "call stack size exceeded".
		  let res = '';
		  let i = 0;
		  while (i < len) {
		    res += String.fromCharCode.apply(
		      String,
		      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
		    );
		  }
		  return res
		}

		function asciiSlice (buf, start, end) {
		  let ret = '';
		  end = Math.min(buf.length, end);

		  for (let i = start; i < end; ++i) {
		    ret += String.fromCharCode(buf[i] & 0x7F);
		  }
		  return ret
		}

		function latin1Slice (buf, start, end) {
		  let ret = '';
		  end = Math.min(buf.length, end);

		  for (let i = start; i < end; ++i) {
		    ret += String.fromCharCode(buf[i]);
		  }
		  return ret
		}

		function hexSlice (buf, start, end) {
		  const len = buf.length;

		  if (!start || start < 0) start = 0;
		  if (!end || end < 0 || end > len) end = len;

		  let out = '';
		  for (let i = start; i < end; ++i) {
		    out += hexSliceLookupTable[buf[i]];
		  }
		  return out
		}

		function utf16leSlice (buf, start, end) {
		  const bytes = buf.slice(start, end);
		  let res = '';
		  // If bytes.length is odd, the last 8 bits must be ignored (same as node.js)
		  for (let i = 0; i < bytes.length - 1; i += 2) {
		    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256));
		  }
		  return res
		}

		Buffer.prototype.slice = function slice (start, end) {
		  const len = this.length;
		  start = ~~start;
		  end = end === undefined ? len : ~~end;

		  if (start < 0) {
		    start += len;
		    if (start < 0) start = 0;
		  } else if (start > len) {
		    start = len;
		  }

		  if (end < 0) {
		    end += len;
		    if (end < 0) end = 0;
		  } else if (end > len) {
		    end = len;
		  }

		  if (end < start) end = start;

		  const newBuf = this.subarray(start, end);
		  // Return an augmented `Uint8Array` instance
		  Object.setPrototypeOf(newBuf, Buffer.prototype);

		  return newBuf
		};

		/*
		 * Need to make sure that buffer isn't trying to write out of bounds.
		 */
		function checkOffset (offset, ext, length) {
		  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
		  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
		}

		Buffer.prototype.readUintLE =
		Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
		  offset = offset >>> 0;
		  byteLength = byteLength >>> 0;
		  if (!noAssert) checkOffset(offset, byteLength, this.length);

		  let val = this[offset];
		  let mul = 1;
		  let i = 0;
		  while (++i < byteLength && (mul *= 0x100)) {
		    val += this[offset + i] * mul;
		  }

		  return val
		};

		Buffer.prototype.readUintBE =
		Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
		  offset = offset >>> 0;
		  byteLength = byteLength >>> 0;
		  if (!noAssert) {
		    checkOffset(offset, byteLength, this.length);
		  }

		  let val = this[offset + --byteLength];
		  let mul = 1;
		  while (byteLength > 0 && (mul *= 0x100)) {
		    val += this[offset + --byteLength] * mul;
		  }

		  return val
		};

		Buffer.prototype.readUint8 =
		Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 1, this.length);
		  return this[offset]
		};

		Buffer.prototype.readUint16LE =
		Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 2, this.length);
		  return this[offset] | (this[offset + 1] << 8)
		};

		Buffer.prototype.readUint16BE =
		Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 2, this.length);
		  return (this[offset] << 8) | this[offset + 1]
		};

		Buffer.prototype.readUint32LE =
		Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 4, this.length);

		  return ((this[offset]) |
		      (this[offset + 1] << 8) |
		      (this[offset + 2] << 16)) +
		      (this[offset + 3] * 0x1000000)
		};

		Buffer.prototype.readUint32BE =
		Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 4, this.length);

		  return (this[offset] * 0x1000000) +
		    ((this[offset + 1] << 16) |
		    (this[offset + 2] << 8) |
		    this[offset + 3])
		};

		Buffer.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE (offset) {
		  offset = offset >>> 0;
		  validateNumber(offset, 'offset');
		  const first = this[offset];
		  const last = this[offset + 7];
		  if (first === undefined || last === undefined) {
		    boundsError(offset, this.length - 8);
		  }

		  const lo = first +
		    this[++offset] * 2 ** 8 +
		    this[++offset] * 2 ** 16 +
		    this[++offset] * 2 ** 24;

		  const hi = this[++offset] +
		    this[++offset] * 2 ** 8 +
		    this[++offset] * 2 ** 16 +
		    last * 2 ** 24;

		  return BigInt(lo) + (BigInt(hi) << BigInt(32))
		});

		Buffer.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE (offset) {
		  offset = offset >>> 0;
		  validateNumber(offset, 'offset');
		  const first = this[offset];
		  const last = this[offset + 7];
		  if (first === undefined || last === undefined) {
		    boundsError(offset, this.length - 8);
		  }

		  const hi = first * 2 ** 24 +
		    this[++offset] * 2 ** 16 +
		    this[++offset] * 2 ** 8 +
		    this[++offset];

		  const lo = this[++offset] * 2 ** 24 +
		    this[++offset] * 2 ** 16 +
		    this[++offset] * 2 ** 8 +
		    last;

		  return (BigInt(hi) << BigInt(32)) + BigInt(lo)
		});

		Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
		  offset = offset >>> 0;
		  byteLength = byteLength >>> 0;
		  if (!noAssert) checkOffset(offset, byteLength, this.length);

		  let val = this[offset];
		  let mul = 1;
		  let i = 0;
		  while (++i < byteLength && (mul *= 0x100)) {
		    val += this[offset + i] * mul;
		  }
		  mul *= 0x80;

		  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

		  return val
		};

		Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
		  offset = offset >>> 0;
		  byteLength = byteLength >>> 0;
		  if (!noAssert) checkOffset(offset, byteLength, this.length);

		  let i = byteLength;
		  let mul = 1;
		  let val = this[offset + --i];
		  while (i > 0 && (mul *= 0x100)) {
		    val += this[offset + --i] * mul;
		  }
		  mul *= 0x80;

		  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

		  return val
		};

		Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 1, this.length);
		  if (!(this[offset] & 0x80)) return (this[offset])
		  return ((0xff - this[offset] + 1) * -1)
		};

		Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 2, this.length);
		  const val = this[offset] | (this[offset + 1] << 8);
		  return (val & 0x8000) ? val | 0xFFFF0000 : val
		};

		Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 2, this.length);
		  const val = this[offset + 1] | (this[offset] << 8);
		  return (val & 0x8000) ? val | 0xFFFF0000 : val
		};

		Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 4, this.length);

		  return (this[offset]) |
		    (this[offset + 1] << 8) |
		    (this[offset + 2] << 16) |
		    (this[offset + 3] << 24)
		};

		Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 4, this.length);

		  return (this[offset] << 24) |
		    (this[offset + 1] << 16) |
		    (this[offset + 2] << 8) |
		    (this[offset + 3])
		};

		Buffer.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE (offset) {
		  offset = offset >>> 0;
		  validateNumber(offset, 'offset');
		  const first = this[offset];
		  const last = this[offset + 7];
		  if (first === undefined || last === undefined) {
		    boundsError(offset, this.length - 8);
		  }

		  const val = this[offset + 4] +
		    this[offset + 5] * 2 ** 8 +
		    this[offset + 6] * 2 ** 16 +
		    (last << 24); // Overflow

		  return (BigInt(val) << BigInt(32)) +
		    BigInt(first +
		    this[++offset] * 2 ** 8 +
		    this[++offset] * 2 ** 16 +
		    this[++offset] * 2 ** 24)
		});

		Buffer.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE (offset) {
		  offset = offset >>> 0;
		  validateNumber(offset, 'offset');
		  const first = this[offset];
		  const last = this[offset + 7];
		  if (first === undefined || last === undefined) {
		    boundsError(offset, this.length - 8);
		  }

		  const val = (first << 24) + // Overflow
		    this[++offset] * 2 ** 16 +
		    this[++offset] * 2 ** 8 +
		    this[++offset];

		  return (BigInt(val) << BigInt(32)) +
		    BigInt(this[++offset] * 2 ** 24 +
		    this[++offset] * 2 ** 16 +
		    this[++offset] * 2 ** 8 +
		    last)
		});

		Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 4, this.length);
		  return ieee754.read(this, offset, true, 23, 4)
		};

		Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 4, this.length);
		  return ieee754.read(this, offset, false, 23, 4)
		};

		Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 8, this.length);
		  return ieee754.read(this, offset, true, 52, 8)
		};

		Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 8, this.length);
		  return ieee754.read(this, offset, false, 52, 8)
		};

		function checkInt (buf, value, offset, ext, max, min) {
		  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
		  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
		  if (offset + ext > buf.length) throw new RangeError('Index out of range')
		}

		Buffer.prototype.writeUintLE =
		Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  byteLength = byteLength >>> 0;
		  if (!noAssert) {
		    const maxBytes = Math.pow(2, 8 * byteLength) - 1;
		    checkInt(this, value, offset, byteLength, maxBytes, 0);
		  }

		  let mul = 1;
		  let i = 0;
		  this[offset] = value & 0xFF;
		  while (++i < byteLength && (mul *= 0x100)) {
		    this[offset + i] = (value / mul) & 0xFF;
		  }

		  return offset + byteLength
		};

		Buffer.prototype.writeUintBE =
		Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  byteLength = byteLength >>> 0;
		  if (!noAssert) {
		    const maxBytes = Math.pow(2, 8 * byteLength) - 1;
		    checkInt(this, value, offset, byteLength, maxBytes, 0);
		  }

		  let i = byteLength - 1;
		  let mul = 1;
		  this[offset + i] = value & 0xFF;
		  while (--i >= 0 && (mul *= 0x100)) {
		    this[offset + i] = (value / mul) & 0xFF;
		  }

		  return offset + byteLength
		};

		Buffer.prototype.writeUint8 =
		Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
		  this[offset] = (value & 0xff);
		  return offset + 1
		};

		Buffer.prototype.writeUint16LE =
		Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
		  this[offset] = (value & 0xff);
		  this[offset + 1] = (value >>> 8);
		  return offset + 2
		};

		Buffer.prototype.writeUint16BE =
		Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
		  this[offset] = (value >>> 8);
		  this[offset + 1] = (value & 0xff);
		  return offset + 2
		};

		Buffer.prototype.writeUint32LE =
		Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
		  this[offset + 3] = (value >>> 24);
		  this[offset + 2] = (value >>> 16);
		  this[offset + 1] = (value >>> 8);
		  this[offset] = (value & 0xff);
		  return offset + 4
		};

		Buffer.prototype.writeUint32BE =
		Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
		  this[offset] = (value >>> 24);
		  this[offset + 1] = (value >>> 16);
		  this[offset + 2] = (value >>> 8);
		  this[offset + 3] = (value & 0xff);
		  return offset + 4
		};

		function wrtBigUInt64LE (buf, value, offset, min, max) {
		  checkIntBI(value, min, max, buf, offset, 7);

		  let lo = Number(value & BigInt(0xffffffff));
		  buf[offset++] = lo;
		  lo = lo >> 8;
		  buf[offset++] = lo;
		  lo = lo >> 8;
		  buf[offset++] = lo;
		  lo = lo >> 8;
		  buf[offset++] = lo;
		  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff));
		  buf[offset++] = hi;
		  hi = hi >> 8;
		  buf[offset++] = hi;
		  hi = hi >> 8;
		  buf[offset++] = hi;
		  hi = hi >> 8;
		  buf[offset++] = hi;
		  return offset
		}

		function wrtBigUInt64BE (buf, value, offset, min, max) {
		  checkIntBI(value, min, max, buf, offset, 7);

		  let lo = Number(value & BigInt(0xffffffff));
		  buf[offset + 7] = lo;
		  lo = lo >> 8;
		  buf[offset + 6] = lo;
		  lo = lo >> 8;
		  buf[offset + 5] = lo;
		  lo = lo >> 8;
		  buf[offset + 4] = lo;
		  let hi = Number(value >> BigInt(32) & BigInt(0xffffffff));
		  buf[offset + 3] = hi;
		  hi = hi >> 8;
		  buf[offset + 2] = hi;
		  hi = hi >> 8;
		  buf[offset + 1] = hi;
		  hi = hi >> 8;
		  buf[offset] = hi;
		  return offset + 8
		}

		Buffer.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE (value, offset = 0) {
		  return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
		});

		Buffer.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE (value, offset = 0) {
		  return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt('0xffffffffffffffff'))
		});

		Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) {
		    const limit = Math.pow(2, (8 * byteLength) - 1);

		    checkInt(this, value, offset, byteLength, limit - 1, -limit);
		  }

		  let i = 0;
		  let mul = 1;
		  let sub = 0;
		  this[offset] = value & 0xFF;
		  while (++i < byteLength && (mul *= 0x100)) {
		    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
		      sub = 1;
		    }
		    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
		  }

		  return offset + byteLength
		};

		Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) {
		    const limit = Math.pow(2, (8 * byteLength) - 1);

		    checkInt(this, value, offset, byteLength, limit - 1, -limit);
		  }

		  let i = byteLength - 1;
		  let mul = 1;
		  let sub = 0;
		  this[offset + i] = value & 0xFF;
		  while (--i >= 0 && (mul *= 0x100)) {
		    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
		      sub = 1;
		    }
		    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
		  }

		  return offset + byteLength
		};

		Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -128);
		  if (value < 0) value = 0xff + value + 1;
		  this[offset] = (value & 0xff);
		  return offset + 1
		};

		Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -32768);
		  this[offset] = (value & 0xff);
		  this[offset + 1] = (value >>> 8);
		  return offset + 2
		};

		Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -32768);
		  this[offset] = (value >>> 8);
		  this[offset + 1] = (value & 0xff);
		  return offset + 2
		};

		Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -2147483648);
		  this[offset] = (value & 0xff);
		  this[offset + 1] = (value >>> 8);
		  this[offset + 2] = (value >>> 16);
		  this[offset + 3] = (value >>> 24);
		  return offset + 4
		};

		Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -2147483648);
		  if (value < 0) value = 0xffffffff + value + 1;
		  this[offset] = (value >>> 24);
		  this[offset + 1] = (value >>> 16);
		  this[offset + 2] = (value >>> 8);
		  this[offset + 3] = (value & 0xff);
		  return offset + 4
		};

		Buffer.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE (value, offset = 0) {
		  return wrtBigUInt64LE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
		});

		Buffer.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE (value, offset = 0) {
		  return wrtBigUInt64BE(this, value, offset, -BigInt('0x8000000000000000'), BigInt('0x7fffffffffffffff'))
		});

		function checkIEEE754 (buf, value, offset, ext, max, min) {
		  if (offset + ext > buf.length) throw new RangeError('Index out of range')
		  if (offset < 0) throw new RangeError('Index out of range')
		}

		function writeFloat (buf, value, offset, littleEndian, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) {
		    checkIEEE754(buf, value, offset, 4);
		  }
		  ieee754.write(buf, value, offset, littleEndian, 23, 4);
		  return offset + 4
		}

		Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
		  return writeFloat(this, value, offset, true, noAssert)
		};

		Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
		  return writeFloat(this, value, offset, false, noAssert)
		};

		function writeDouble (buf, value, offset, littleEndian, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) {
		    checkIEEE754(buf, value, offset, 8);
		  }
		  ieee754.write(buf, value, offset, littleEndian, 52, 8);
		  return offset + 8
		}

		Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
		  return writeDouble(this, value, offset, true, noAssert)
		};

		Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
		  return writeDouble(this, value, offset, false, noAssert)
		};

		// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
		Buffer.prototype.copy = function copy (target, targetStart, start, end) {
		  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
		  if (!start) start = 0;
		  if (!end && end !== 0) end = this.length;
		  if (targetStart >= target.length) targetStart = target.length;
		  if (!targetStart) targetStart = 0;
		  if (end > 0 && end < start) end = start;

		  // Copy 0 bytes; we're done
		  if (end === start) return 0
		  if (target.length === 0 || this.length === 0) return 0

		  // Fatal error conditions
		  if (targetStart < 0) {
		    throw new RangeError('targetStart out of bounds')
		  }
		  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
		  if (end < 0) throw new RangeError('sourceEnd out of bounds')

		  // Are we oob?
		  if (end > this.length) end = this.length;
		  if (target.length - targetStart < end - start) {
		    end = target.length - targetStart + start;
		  }

		  const len = end - start;

		  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
		    // Use built-in when available, missing from IE11
		    this.copyWithin(targetStart, start, end);
		  } else {
		    Uint8Array.prototype.set.call(
		      target,
		      this.subarray(start, end),
		      targetStart
		    );
		  }

		  return len
		};

		// Usage:
		//    buffer.fill(number[, offset[, end]])
		//    buffer.fill(buffer[, offset[, end]])
		//    buffer.fill(string[, offset[, end]][, encoding])
		Buffer.prototype.fill = function fill (val, start, end, encoding) {
		  // Handle string cases:
		  if (typeof val === 'string') {
		    if (typeof start === 'string') {
		      encoding = start;
		      start = 0;
		      end = this.length;
		    } else if (typeof end === 'string') {
		      encoding = end;
		      end = this.length;
		    }
		    if (encoding !== undefined && typeof encoding !== 'string') {
		      throw new TypeError('encoding must be a string')
		    }
		    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
		      throw new TypeError('Unknown encoding: ' + encoding)
		    }
		    if (val.length === 1) {
		      const code = val.charCodeAt(0);
		      if ((encoding === 'utf8' && code < 128) ||
		          encoding === 'latin1') {
		        // Fast path: If `val` fits into a single byte, use that numeric value.
		        val = code;
		      }
		    }
		  } else if (typeof val === 'number') {
		    val = val & 255;
		  } else if (typeof val === 'boolean') {
		    val = Number(val);
		  }

		  // Invalid ranges are not set to a default, so can range check early.
		  if (start < 0 || this.length < start || this.length < end) {
		    throw new RangeError('Out of range index')
		  }

		  if (end <= start) {
		    return this
		  }

		  start = start >>> 0;
		  end = end === undefined ? this.length : end >>> 0;

		  if (!val) val = 0;

		  let i;
		  if (typeof val === 'number') {
		    for (i = start; i < end; ++i) {
		      this[i] = val;
		    }
		  } else {
		    const bytes = Buffer.isBuffer(val)
		      ? val
		      : Buffer.from(val, encoding);
		    const len = bytes.length;
		    if (len === 0) {
		      throw new TypeError('The value "' + val +
		        '" is invalid for argument "value"')
		    }
		    for (i = 0; i < end - start; ++i) {
		      this[i + start] = bytes[i % len];
		    }
		  }

		  return this
		};

		// CUSTOM ERRORS
		// =============

		// Simplified versions from Node, changed for Buffer-only usage
		const errors = {};
		function E (sym, getMessage, Base) {
		  errors[sym] = class NodeError extends Base {
		    constructor () {
		      super();

		      Object.defineProperty(this, 'message', {
		        value: getMessage.apply(this, arguments),
		        writable: true,
		        configurable: true
		      });

		      // Add the error code to the name to include it in the stack trace.
		      this.name = `${this.name} [${sym}]`;
		      // Access the stack to generate the error message including the error code
		      // from the name.
		      this.stack; // eslint-disable-line no-unused-expressions
		      // Reset the name to the actual name.
		      delete this.name;
		    }

		    get code () {
		      return sym
		    }

		    set code (value) {
		      Object.defineProperty(this, 'code', {
		        configurable: true,
		        enumerable: true,
		        value,
		        writable: true
		      });
		    }

		    toString () {
		      return `${this.name} [${sym}]: ${this.message}`
		    }
		  };
		}

		E('ERR_BUFFER_OUT_OF_BOUNDS',
		  function (name) {
		    if (name) {
		      return `${name} is outside of buffer bounds`
		    }

		    return 'Attempt to access memory outside buffer bounds'
		  }, RangeError);
		E('ERR_INVALID_ARG_TYPE',
		  function (name, actual) {
		    return `The "${name}" argument must be of type number. Received type ${typeof actual}`
		  }, TypeError);
		E('ERR_OUT_OF_RANGE',
		  function (str, range, input) {
		    let msg = `The value of "${str}" is out of range.`;
		    let received = input;
		    if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
		      received = addNumericalSeparator(String(input));
		    } else if (typeof input === 'bigint') {
		      received = String(input);
		      if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
		        received = addNumericalSeparator(received);
		      }
		      received += 'n';
		    }
		    msg += ` It must be ${range}. Received ${received}`;
		    return msg
		  }, RangeError);

		function addNumericalSeparator (val) {
		  let res = '';
		  let i = val.length;
		  const start = val[0] === '-' ? 1 : 0;
		  for (; i >= start + 4; i -= 3) {
		    res = `_${val.slice(i - 3, i)}${res}`;
		  }
		  return `${val.slice(0, i)}${res}`
		}

		// CHECK FUNCTIONS
		// ===============

		function checkBounds (buf, offset, byteLength) {
		  validateNumber(offset, 'offset');
		  if (buf[offset] === undefined || buf[offset + byteLength] === undefined) {
		    boundsError(offset, buf.length - (byteLength + 1));
		  }
		}

		function checkIntBI (value, min, max, buf, offset, byteLength) {
		  if (value > max || value < min) {
		    const n = typeof min === 'bigint' ? 'n' : '';
		    let range;
		    {
		      if (min === 0 || min === BigInt(0)) {
		        range = `>= 0${n} and < 2${n} ** ${(byteLength + 1) * 8}${n}`;
		      } else {
		        range = `>= -(2${n} ** ${(byteLength + 1) * 8 - 1}${n}) and < 2 ** ` +
		                `${(byteLength + 1) * 8 - 1}${n}`;
		      }
		    }
		    throw new errors.ERR_OUT_OF_RANGE('value', range, value)
		  }
		  checkBounds(buf, offset, byteLength);
		}

		function validateNumber (value, name) {
		  if (typeof value !== 'number') {
		    throw new errors.ERR_INVALID_ARG_TYPE(name, 'number', value)
		  }
		}

		function boundsError (value, length, type) {
		  if (Math.floor(value) !== value) {
		    validateNumber(value, type);
		    throw new errors.ERR_OUT_OF_RANGE('offset', 'an integer', value)
		  }

		  if (length < 0) {
		    throw new errors.ERR_BUFFER_OUT_OF_BOUNDS()
		  }

		  throw new errors.ERR_OUT_OF_RANGE('offset',
		                                    `>= ${0} and <= ${length}`,
		                                    value)
		}

		// HELPER FUNCTIONS
		// ================

		const INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;

		function base64clean (str) {
		  // Node takes equal signs as end of the Base64 encoding
		  str = str.split('=')[0];
		  // Node strips out invalid characters like \n and \t from the string, base64-js does not
		  str = str.trim().replace(INVALID_BASE64_RE, '');
		  // Node converts strings with length < 2 to ''
		  if (str.length < 2) return ''
		  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
		  while (str.length % 4 !== 0) {
		    str = str + '=';
		  }
		  return str
		}

		function utf8ToBytes (string, units) {
		  units = units || Infinity;
		  let codePoint;
		  const length = string.length;
		  let leadSurrogate = null;
		  const bytes = [];

		  for (let i = 0; i < length; ++i) {
		    codePoint = string.charCodeAt(i);

		    // is surrogate component
		    if (codePoint > 0xD7FF && codePoint < 0xE000) {
		      // last char was a lead
		      if (!leadSurrogate) {
		        // no lead yet
		        if (codePoint > 0xDBFF) {
		          // unexpected trail
		          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
		          continue
		        } else if (i + 1 === length) {
		          // unpaired lead
		          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
		          continue
		        }

		        // valid lead
		        leadSurrogate = codePoint;

		        continue
		      }

		      // 2 leads in a row
		      if (codePoint < 0xDC00) {
		        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
		        leadSurrogate = codePoint;
		        continue
		      }

		      // valid surrogate pair
		      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
		    } else if (leadSurrogate) {
		      // valid bmp char, but last char was a lead
		      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
		    }

		    leadSurrogate = null;

		    // encode utf8
		    if (codePoint < 0x80) {
		      if ((units -= 1) < 0) break
		      bytes.push(codePoint);
		    } else if (codePoint < 0x800) {
		      if ((units -= 2) < 0) break
		      bytes.push(
		        codePoint >> 0x6 | 0xC0,
		        codePoint & 0x3F | 0x80
		      );
		    } else if (codePoint < 0x10000) {
		      if ((units -= 3) < 0) break
		      bytes.push(
		        codePoint >> 0xC | 0xE0,
		        codePoint >> 0x6 & 0x3F | 0x80,
		        codePoint & 0x3F | 0x80
		      );
		    } else if (codePoint < 0x110000) {
		      if ((units -= 4) < 0) break
		      bytes.push(
		        codePoint >> 0x12 | 0xF0,
		        codePoint >> 0xC & 0x3F | 0x80,
		        codePoint >> 0x6 & 0x3F | 0x80,
		        codePoint & 0x3F | 0x80
		      );
		    } else {
		      throw new Error('Invalid code point')
		    }
		  }

		  return bytes
		}

		function asciiToBytes (str) {
		  const byteArray = [];
		  for (let i = 0; i < str.length; ++i) {
		    // Node's code seems to be doing this and not & 0x7F..
		    byteArray.push(str.charCodeAt(i) & 0xFF);
		  }
		  return byteArray
		}

		function utf16leToBytes (str, units) {
		  let c, hi, lo;
		  const byteArray = [];
		  for (let i = 0; i < str.length; ++i) {
		    if ((units -= 2) < 0) break

		    c = str.charCodeAt(i);
		    hi = c >> 8;
		    lo = c % 256;
		    byteArray.push(lo);
		    byteArray.push(hi);
		  }

		  return byteArray
		}

		function base64ToBytes (str) {
		  return base64.toByteArray(base64clean(str))
		}

		function blitBuffer (src, dst, offset, length) {
		  let i;
		  for (i = 0; i < length; ++i) {
		    if ((i + offset >= dst.length) || (i >= src.length)) break
		    dst[i + offset] = src[i];
		  }
		  return i
		}

		// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
		// the `instanceof` check but they should be treated as of that type.
		// See: https://github.com/feross/buffer/issues/166
		function isInstance (obj, type) {
		  return obj instanceof type ||
		    (obj != null && obj.constructor != null && obj.constructor.name != null &&
		      obj.constructor.name === type.name)
		}
		function numberIsNaN (obj) {
		  // For IE11 support
		  return obj !== obj // eslint-disable-line no-self-compare
		}

		// Create lookup table for `toString('hex')`
		// See: https://github.com/feross/buffer/issues/219
		const hexSliceLookupTable = (function () {
		  const alphabet = '0123456789abcdef';
		  const table = new Array(256);
		  for (let i = 0; i < 16; ++i) {
		    const i16 = i * 16;
		    for (let j = 0; j < 16; ++j) {
		      table[i16 + j] = alphabet[i] + alphabet[j];
		    }
		  }
		  return table
		})();

		// Return not function with Error if BigInt not supported
		function defineBigIntMethod (fn) {
		  return typeof BigInt === 'undefined' ? BufferBigIntNotDefined : fn
		}

		function BufferBigIntNotDefined () {
		  throw new Error('BigInt not supported')
		} 
	} (buffer$1));
	return buffer$1;
}

var bufferExports$1 = requireBuffer$1();

var dist = {};

var buffer = {};

/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

var hasRequiredBuffer;

function requireBuffer () {
	if (hasRequiredBuffer) return buffer;
	hasRequiredBuffer = 1;
	(function (exports$1) {

		var base64 = requireBase64Js();
		var ieee754 = requireIeee754();
		var customInspectSymbol =
		  (typeof Symbol === 'function' && typeof Symbol['for'] === 'function') // eslint-disable-line dot-notation
		    ? Symbol['for']('nodejs.util.inspect.custom') // eslint-disable-line dot-notation
		    : null;

		exports$1.Buffer = Buffer;
		exports$1.SlowBuffer = SlowBuffer;
		exports$1.INSPECT_MAX_BYTES = 50;

		var K_MAX_LENGTH = 0x7fffffff;
		exports$1.kMaxLength = K_MAX_LENGTH;

		/**
		 * If `Buffer.TYPED_ARRAY_SUPPORT`:
		 *   === true    Use Uint8Array implementation (fastest)
		 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
		 *               implementation (most compatible, even IE6)
		 *
		 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
		 * Opera 11.6+, iOS 4.2+.
		 *
		 * We report that the browser does not support typed arrays if the are not subclassable
		 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
		 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
		 * for __proto__ and has a buggy typed array implementation.
		 */
		Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport();

		if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
		    typeof console.error === 'function') {
		  console.error(
		    'This browser lacks typed array (Uint8Array) support which is required by ' +
		    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
		  );
		}

		function typedArraySupport () {
		  // Can typed array instances can be augmented?
		  try {
		    var arr = new Uint8Array(1);
		    var proto = { foo: function () { return 42 } };
		    Object.setPrototypeOf(proto, Uint8Array.prototype);
		    Object.setPrototypeOf(arr, proto);
		    return arr.foo() === 42
		  } catch (e) {
		    return false
		  }
		}

		Object.defineProperty(Buffer.prototype, 'parent', {
		  enumerable: true,
		  get: function () {
		    if (!Buffer.isBuffer(this)) return undefined
		    return this.buffer
		  }
		});

		Object.defineProperty(Buffer.prototype, 'offset', {
		  enumerable: true,
		  get: function () {
		    if (!Buffer.isBuffer(this)) return undefined
		    return this.byteOffset
		  }
		});

		function createBuffer (length) {
		  if (length > K_MAX_LENGTH) {
		    throw new RangeError('The value "' + length + '" is invalid for option "size"')
		  }
		  // Return an augmented `Uint8Array` instance
		  var buf = new Uint8Array(length);
		  Object.setPrototypeOf(buf, Buffer.prototype);
		  return buf
		}

		/**
		 * The Buffer constructor returns instances of `Uint8Array` that have their
		 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
		 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
		 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
		 * returns a single octet.
		 *
		 * The `Uint8Array` prototype remains unmodified.
		 */

		function Buffer (arg, encodingOrOffset, length) {
		  // Common case.
		  if (typeof arg === 'number') {
		    if (typeof encodingOrOffset === 'string') {
		      throw new TypeError(
		        'The "string" argument must be of type string. Received type number'
		      )
		    }
		    return allocUnsafe(arg)
		  }
		  return from(arg, encodingOrOffset, length)
		}

		Buffer.poolSize = 8192; // not used by this implementation

		function from (value, encodingOrOffset, length) {
		  if (typeof value === 'string') {
		    return fromString(value, encodingOrOffset)
		  }

		  if (ArrayBuffer.isView(value)) {
		    return fromArrayView(value)
		  }

		  if (value == null) {
		    throw new TypeError(
		      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
		      'or Array-like Object. Received type ' + (typeof value)
		    )
		  }

		  if (isInstance(value, ArrayBuffer) ||
		      (value && isInstance(value.buffer, ArrayBuffer))) {
		    return fromArrayBuffer(value, encodingOrOffset, length)
		  }

		  if (typeof SharedArrayBuffer !== 'undefined' &&
		      (isInstance(value, SharedArrayBuffer) ||
		      (value && isInstance(value.buffer, SharedArrayBuffer)))) {
		    return fromArrayBuffer(value, encodingOrOffset, length)
		  }

		  if (typeof value === 'number') {
		    throw new TypeError(
		      'The "value" argument must not be of type number. Received type number'
		    )
		  }

		  var valueOf = value.valueOf && value.valueOf();
		  if (valueOf != null && valueOf !== value) {
		    return Buffer.from(valueOf, encodingOrOffset, length)
		  }

		  var b = fromObject(value);
		  if (b) return b

		  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
		      typeof value[Symbol.toPrimitive] === 'function') {
		    return Buffer.from(
		      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
		    )
		  }

		  throw new TypeError(
		    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
		    'or Array-like Object. Received type ' + (typeof value)
		  )
		}

		/**
		 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
		 * if value is a number.
		 * Buffer.from(str[, encoding])
		 * Buffer.from(array)
		 * Buffer.from(buffer)
		 * Buffer.from(arrayBuffer[, byteOffset[, length]])
		 **/
		Buffer.from = function (value, encodingOrOffset, length) {
		  return from(value, encodingOrOffset, length)
		};

		// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
		// https://github.com/feross/buffer/pull/148
		Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype);
		Object.setPrototypeOf(Buffer, Uint8Array);

		function assertSize (size) {
		  if (typeof size !== 'number') {
		    throw new TypeError('"size" argument must be of type number')
		  } else if (size < 0) {
		    throw new RangeError('The value "' + size + '" is invalid for option "size"')
		  }
		}

		function alloc (size, fill, encoding) {
		  assertSize(size);
		  if (size <= 0) {
		    return createBuffer(size)
		  }
		  if (fill !== undefined) {
		    // Only pay attention to encoding if it's a string. This
		    // prevents accidentally sending in a number that would
		    // be interpreted as a start offset.
		    return typeof encoding === 'string'
		      ? createBuffer(size).fill(fill, encoding)
		      : createBuffer(size).fill(fill)
		  }
		  return createBuffer(size)
		}

		/**
		 * Creates a new filled Buffer instance.
		 * alloc(size[, fill[, encoding]])
		 **/
		Buffer.alloc = function (size, fill, encoding) {
		  return alloc(size, fill, encoding)
		};

		function allocUnsafe (size) {
		  assertSize(size);
		  return createBuffer(size < 0 ? 0 : checked(size) | 0)
		}

		/**
		 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
		 * */
		Buffer.allocUnsafe = function (size) {
		  return allocUnsafe(size)
		};
		/**
		 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
		 */
		Buffer.allocUnsafeSlow = function (size) {
		  return allocUnsafe(size)
		};

		function fromString (string, encoding) {
		  if (typeof encoding !== 'string' || encoding === '') {
		    encoding = 'utf8';
		  }

		  if (!Buffer.isEncoding(encoding)) {
		    throw new TypeError('Unknown encoding: ' + encoding)
		  }

		  var length = byteLength(string, encoding) | 0;
		  var buf = createBuffer(length);

		  var actual = buf.write(string, encoding);

		  if (actual !== length) {
		    // Writing a hex string, for example, that contains invalid characters will
		    // cause everything after the first invalid character to be ignored. (e.g.
		    // 'abxxcd' will be treated as 'ab')
		    buf = buf.slice(0, actual);
		  }

		  return buf
		}

		function fromArrayLike (array) {
		  var length = array.length < 0 ? 0 : checked(array.length) | 0;
		  var buf = createBuffer(length);
		  for (var i = 0; i < length; i += 1) {
		    buf[i] = array[i] & 255;
		  }
		  return buf
		}

		function fromArrayView (arrayView) {
		  if (isInstance(arrayView, Uint8Array)) {
		    var copy = new Uint8Array(arrayView);
		    return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength)
		  }
		  return fromArrayLike(arrayView)
		}

		function fromArrayBuffer (array, byteOffset, length) {
		  if (byteOffset < 0 || array.byteLength < byteOffset) {
		    throw new RangeError('"offset" is outside of buffer bounds')
		  }

		  if (array.byteLength < byteOffset + (length || 0)) {
		    throw new RangeError('"length" is outside of buffer bounds')
		  }

		  var buf;
		  if (byteOffset === undefined && length === undefined) {
		    buf = new Uint8Array(array);
		  } else if (length === undefined) {
		    buf = new Uint8Array(array, byteOffset);
		  } else {
		    buf = new Uint8Array(array, byteOffset, length);
		  }

		  // Return an augmented `Uint8Array` instance
		  Object.setPrototypeOf(buf, Buffer.prototype);

		  return buf
		}

		function fromObject (obj) {
		  if (Buffer.isBuffer(obj)) {
		    var len = checked(obj.length) | 0;
		    var buf = createBuffer(len);

		    if (buf.length === 0) {
		      return buf
		    }

		    obj.copy(buf, 0, 0, len);
		    return buf
		  }

		  if (obj.length !== undefined) {
		    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
		      return createBuffer(0)
		    }
		    return fromArrayLike(obj)
		  }

		  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
		    return fromArrayLike(obj.data)
		  }
		}

		function checked (length) {
		  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
		  // length is NaN (which is otherwise coerced to zero.)
		  if (length >= K_MAX_LENGTH) {
		    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
		                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
		  }
		  return length | 0
		}

		function SlowBuffer (length) {
		  if (+length != length) { // eslint-disable-line eqeqeq
		    length = 0;
		  }
		  return Buffer.alloc(+length)
		}

		Buffer.isBuffer = function isBuffer (b) {
		  return b != null && b._isBuffer === true &&
		    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
		};

		Buffer.compare = function compare (a, b) {
		  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength);
		  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength);
		  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
		    throw new TypeError(
		      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
		    )
		  }

		  if (a === b) return 0

		  var x = a.length;
		  var y = b.length;

		  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
		    if (a[i] !== b[i]) {
		      x = a[i];
		      y = b[i];
		      break
		    }
		  }

		  if (x < y) return -1
		  if (y < x) return 1
		  return 0
		};

		Buffer.isEncoding = function isEncoding (encoding) {
		  switch (String(encoding).toLowerCase()) {
		    case 'hex':
		    case 'utf8':
		    case 'utf-8':
		    case 'ascii':
		    case 'latin1':
		    case 'binary':
		    case 'base64':
		    case 'ucs2':
		    case 'ucs-2':
		    case 'utf16le':
		    case 'utf-16le':
		      return true
		    default:
		      return false
		  }
		};

		Buffer.concat = function concat (list, length) {
		  if (!Array.isArray(list)) {
		    throw new TypeError('"list" argument must be an Array of Buffers')
		  }

		  if (list.length === 0) {
		    return Buffer.alloc(0)
		  }

		  var i;
		  if (length === undefined) {
		    length = 0;
		    for (i = 0; i < list.length; ++i) {
		      length += list[i].length;
		    }
		  }

		  var buffer = Buffer.allocUnsafe(length);
		  var pos = 0;
		  for (i = 0; i < list.length; ++i) {
		    var buf = list[i];
		    if (isInstance(buf, Uint8Array)) {
		      if (pos + buf.length > buffer.length) {
		        Buffer.from(buf).copy(buffer, pos);
		      } else {
		        Uint8Array.prototype.set.call(
		          buffer,
		          buf,
		          pos
		        );
		      }
		    } else if (!Buffer.isBuffer(buf)) {
		      throw new TypeError('"list" argument must be an Array of Buffers')
		    } else {
		      buf.copy(buffer, pos);
		    }
		    pos += buf.length;
		  }
		  return buffer
		};

		function byteLength (string, encoding) {
		  if (Buffer.isBuffer(string)) {
		    return string.length
		  }
		  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
		    return string.byteLength
		  }
		  if (typeof string !== 'string') {
		    throw new TypeError(
		      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
		      'Received type ' + typeof string
		    )
		  }

		  var len = string.length;
		  var mustMatch = (arguments.length > 2 && arguments[2] === true);
		  if (!mustMatch && len === 0) return 0

		  // Use a for loop to avoid recursion
		  var loweredCase = false;
		  for (;;) {
		    switch (encoding) {
		      case 'ascii':
		      case 'latin1':
		      case 'binary':
		        return len
		      case 'utf8':
		      case 'utf-8':
		        return utf8ToBytes(string).length
		      case 'ucs2':
		      case 'ucs-2':
		      case 'utf16le':
		      case 'utf-16le':
		        return len * 2
		      case 'hex':
		        return len >>> 1
		      case 'base64':
		        return base64ToBytes(string).length
		      default:
		        if (loweredCase) {
		          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
		        }
		        encoding = ('' + encoding).toLowerCase();
		        loweredCase = true;
		    }
		  }
		}
		Buffer.byteLength = byteLength;

		function slowToString (encoding, start, end) {
		  var loweredCase = false;

		  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
		  // property of a typed array.

		  // This behaves neither like String nor Uint8Array in that we set start/end
		  // to their upper/lower bounds if the value passed is out of range.
		  // undefined is handled specially as per ECMA-262 6th Edition,
		  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
		  if (start === undefined || start < 0) {
		    start = 0;
		  }
		  // Return early if start > this.length. Done here to prevent potential uint32
		  // coercion fail below.
		  if (start > this.length) {
		    return ''
		  }

		  if (end === undefined || end > this.length) {
		    end = this.length;
		  }

		  if (end <= 0) {
		    return ''
		  }

		  // Force coercion to uint32. This will also coerce falsey/NaN values to 0.
		  end >>>= 0;
		  start >>>= 0;

		  if (end <= start) {
		    return ''
		  }

		  if (!encoding) encoding = 'utf8';

		  while (true) {
		    switch (encoding) {
		      case 'hex':
		        return hexSlice(this, start, end)

		      case 'utf8':
		      case 'utf-8':
		        return utf8Slice(this, start, end)

		      case 'ascii':
		        return asciiSlice(this, start, end)

		      case 'latin1':
		      case 'binary':
		        return latin1Slice(this, start, end)

		      case 'base64':
		        return base64Slice(this, start, end)

		      case 'ucs2':
		      case 'ucs-2':
		      case 'utf16le':
		      case 'utf-16le':
		        return utf16leSlice(this, start, end)

		      default:
		        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
		        encoding = (encoding + '').toLowerCase();
		        loweredCase = true;
		    }
		  }
		}

		// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
		// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
		// reliably in a browserify context because there could be multiple different
		// copies of the 'buffer' package in use. This method works even for Buffer
		// instances that were created from another copy of the `buffer` package.
		// See: https://github.com/feross/buffer/issues/154
		Buffer.prototype._isBuffer = true;

		function swap (b, n, m) {
		  var i = b[n];
		  b[n] = b[m];
		  b[m] = i;
		}

		Buffer.prototype.swap16 = function swap16 () {
		  var len = this.length;
		  if (len % 2 !== 0) {
		    throw new RangeError('Buffer size must be a multiple of 16-bits')
		  }
		  for (var i = 0; i < len; i += 2) {
		    swap(this, i, i + 1);
		  }
		  return this
		};

		Buffer.prototype.swap32 = function swap32 () {
		  var len = this.length;
		  if (len % 4 !== 0) {
		    throw new RangeError('Buffer size must be a multiple of 32-bits')
		  }
		  for (var i = 0; i < len; i += 4) {
		    swap(this, i, i + 3);
		    swap(this, i + 1, i + 2);
		  }
		  return this
		};

		Buffer.prototype.swap64 = function swap64 () {
		  var len = this.length;
		  if (len % 8 !== 0) {
		    throw new RangeError('Buffer size must be a multiple of 64-bits')
		  }
		  for (var i = 0; i < len; i += 8) {
		    swap(this, i, i + 7);
		    swap(this, i + 1, i + 6);
		    swap(this, i + 2, i + 5);
		    swap(this, i + 3, i + 4);
		  }
		  return this
		};

		Buffer.prototype.toString = function toString () {
		  var length = this.length;
		  if (length === 0) return ''
		  if (arguments.length === 0) return utf8Slice(this, 0, length)
		  return slowToString.apply(this, arguments)
		};

		Buffer.prototype.toLocaleString = Buffer.prototype.toString;

		Buffer.prototype.equals = function equals (b) {
		  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
		  if (this === b) return true
		  return Buffer.compare(this, b) === 0
		};

		Buffer.prototype.inspect = function inspect () {
		  var str = '';
		  var max = exports$1.INSPECT_MAX_BYTES;
		  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim();
		  if (this.length > max) str += ' ... ';
		  return '<Buffer ' + str + '>'
		};
		if (customInspectSymbol) {
		  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect;
		}

		Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
		  if (isInstance(target, Uint8Array)) {
		    target = Buffer.from(target, target.offset, target.byteLength);
		  }
		  if (!Buffer.isBuffer(target)) {
		    throw new TypeError(
		      'The "target" argument must be one of type Buffer or Uint8Array. ' +
		      'Received type ' + (typeof target)
		    )
		  }

		  if (start === undefined) {
		    start = 0;
		  }
		  if (end === undefined) {
		    end = target ? target.length : 0;
		  }
		  if (thisStart === undefined) {
		    thisStart = 0;
		  }
		  if (thisEnd === undefined) {
		    thisEnd = this.length;
		  }

		  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
		    throw new RangeError('out of range index')
		  }

		  if (thisStart >= thisEnd && start >= end) {
		    return 0
		  }
		  if (thisStart >= thisEnd) {
		    return -1
		  }
		  if (start >= end) {
		    return 1
		  }

		  start >>>= 0;
		  end >>>= 0;
		  thisStart >>>= 0;
		  thisEnd >>>= 0;

		  if (this === target) return 0

		  var x = thisEnd - thisStart;
		  var y = end - start;
		  var len = Math.min(x, y);

		  var thisCopy = this.slice(thisStart, thisEnd);
		  var targetCopy = target.slice(start, end);

		  for (var i = 0; i < len; ++i) {
		    if (thisCopy[i] !== targetCopy[i]) {
		      x = thisCopy[i];
		      y = targetCopy[i];
		      break
		    }
		  }

		  if (x < y) return -1
		  if (y < x) return 1
		  return 0
		};

		// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
		// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
		//
		// Arguments:
		// - buffer - a Buffer to search
		// - val - a string, Buffer, or number
		// - byteOffset - an index into `buffer`; will be clamped to an int32
		// - encoding - an optional encoding, relevant is val is a string
		// - dir - true for indexOf, false for lastIndexOf
		function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
		  // Empty buffer means no match
		  if (buffer.length === 0) return -1

		  // Normalize byteOffset
		  if (typeof byteOffset === 'string') {
		    encoding = byteOffset;
		    byteOffset = 0;
		  } else if (byteOffset > 0x7fffffff) {
		    byteOffset = 0x7fffffff;
		  } else if (byteOffset < -2147483648) {
		    byteOffset = -2147483648;
		  }
		  byteOffset = +byteOffset; // Coerce to Number.
		  if (numberIsNaN(byteOffset)) {
		    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
		    byteOffset = dir ? 0 : (buffer.length - 1);
		  }

		  // Normalize byteOffset: negative offsets start from the end of the buffer
		  if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
		  if (byteOffset >= buffer.length) {
		    if (dir) return -1
		    else byteOffset = buffer.length - 1;
		  } else if (byteOffset < 0) {
		    if (dir) byteOffset = 0;
		    else return -1
		  }

		  // Normalize val
		  if (typeof val === 'string') {
		    val = Buffer.from(val, encoding);
		  }

		  // Finally, search either indexOf (if dir is true) or lastIndexOf
		  if (Buffer.isBuffer(val)) {
		    // Special case: looking for empty string/buffer always fails
		    if (val.length === 0) {
		      return -1
		    }
		    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
		  } else if (typeof val === 'number') {
		    val = val & 0xFF; // Search for a byte value [0-255]
		    if (typeof Uint8Array.prototype.indexOf === 'function') {
		      if (dir) {
		        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
		      } else {
		        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
		      }
		    }
		    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
		  }

		  throw new TypeError('val must be string, number or Buffer')
		}

		function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
		  var indexSize = 1;
		  var arrLength = arr.length;
		  var valLength = val.length;

		  if (encoding !== undefined) {
		    encoding = String(encoding).toLowerCase();
		    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
		        encoding === 'utf16le' || encoding === 'utf-16le') {
		      if (arr.length < 2 || val.length < 2) {
		        return -1
		      }
		      indexSize = 2;
		      arrLength /= 2;
		      valLength /= 2;
		      byteOffset /= 2;
		    }
		  }

		  function read (buf, i) {
		    if (indexSize === 1) {
		      return buf[i]
		    } else {
		      return buf.readUInt16BE(i * indexSize)
		    }
		  }

		  var i;
		  if (dir) {
		    var foundIndex = -1;
		    for (i = byteOffset; i < arrLength; i++) {
		      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
		        if (foundIndex === -1) foundIndex = i;
		        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
		      } else {
		        if (foundIndex !== -1) i -= i - foundIndex;
		        foundIndex = -1;
		      }
		    }
		  } else {
		    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
		    for (i = byteOffset; i >= 0; i--) {
		      var found = true;
		      for (var j = 0; j < valLength; j++) {
		        if (read(arr, i + j) !== read(val, j)) {
		          found = false;
		          break
		        }
		      }
		      if (found) return i
		    }
		  }

		  return -1
		}

		Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
		  return this.indexOf(val, byteOffset, encoding) !== -1
		};

		Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
		  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
		};

		Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
		  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
		};

		function hexWrite (buf, string, offset, length) {
		  offset = Number(offset) || 0;
		  var remaining = buf.length - offset;
		  if (!length) {
		    length = remaining;
		  } else {
		    length = Number(length);
		    if (length > remaining) {
		      length = remaining;
		    }
		  }

		  var strLen = string.length;

		  if (length > strLen / 2) {
		    length = strLen / 2;
		  }
		  for (var i = 0; i < length; ++i) {
		    var parsed = parseInt(string.substr(i * 2, 2), 16);
		    if (numberIsNaN(parsed)) return i
		    buf[offset + i] = parsed;
		  }
		  return i
		}

		function utf8Write (buf, string, offset, length) {
		  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
		}

		function asciiWrite (buf, string, offset, length) {
		  return blitBuffer(asciiToBytes(string), buf, offset, length)
		}

		function base64Write (buf, string, offset, length) {
		  return blitBuffer(base64ToBytes(string), buf, offset, length)
		}

		function ucs2Write (buf, string, offset, length) {
		  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
		}

		Buffer.prototype.write = function write (string, offset, length, encoding) {
		  // Buffer#write(string)
		  if (offset === undefined) {
		    encoding = 'utf8';
		    length = this.length;
		    offset = 0;
		  // Buffer#write(string, encoding)
		  } else if (length === undefined && typeof offset === 'string') {
		    encoding = offset;
		    length = this.length;
		    offset = 0;
		  // Buffer#write(string, offset[, length][, encoding])
		  } else if (isFinite(offset)) {
		    offset = offset >>> 0;
		    if (isFinite(length)) {
		      length = length >>> 0;
		      if (encoding === undefined) encoding = 'utf8';
		    } else {
		      encoding = length;
		      length = undefined;
		    }
		  } else {
		    throw new Error(
		      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
		    )
		  }

		  var remaining = this.length - offset;
		  if (length === undefined || length > remaining) length = remaining;

		  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
		    throw new RangeError('Attempt to write outside buffer bounds')
		  }

		  if (!encoding) encoding = 'utf8';

		  var loweredCase = false;
		  for (;;) {
		    switch (encoding) {
		      case 'hex':
		        return hexWrite(this, string, offset, length)

		      case 'utf8':
		      case 'utf-8':
		        return utf8Write(this, string, offset, length)

		      case 'ascii':
		      case 'latin1':
		      case 'binary':
		        return asciiWrite(this, string, offset, length)

		      case 'base64':
		        // Warning: maxLength not taken into account in base64Write
		        return base64Write(this, string, offset, length)

		      case 'ucs2':
		      case 'ucs-2':
		      case 'utf16le':
		      case 'utf-16le':
		        return ucs2Write(this, string, offset, length)

		      default:
		        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
		        encoding = ('' + encoding).toLowerCase();
		        loweredCase = true;
		    }
		  }
		};

		Buffer.prototype.toJSON = function toJSON () {
		  return {
		    type: 'Buffer',
		    data: Array.prototype.slice.call(this._arr || this, 0)
		  }
		};

		function base64Slice (buf, start, end) {
		  if (start === 0 && end === buf.length) {
		    return base64.fromByteArray(buf)
		  } else {
		    return base64.fromByteArray(buf.slice(start, end))
		  }
		}

		function utf8Slice (buf, start, end) {
		  end = Math.min(buf.length, end);
		  var res = [];

		  var i = start;
		  while (i < end) {
		    var firstByte = buf[i];
		    var codePoint = null;
		    var bytesPerSequence = (firstByte > 0xEF)
		      ? 4
		      : (firstByte > 0xDF)
		          ? 3
		          : (firstByte > 0xBF)
		              ? 2
		              : 1;

		    if (i + bytesPerSequence <= end) {
		      var secondByte, thirdByte, fourthByte, tempCodePoint;

		      switch (bytesPerSequence) {
		        case 1:
		          if (firstByte < 0x80) {
		            codePoint = firstByte;
		          }
		          break
		        case 2:
		          secondByte = buf[i + 1];
		          if ((secondByte & 0xC0) === 0x80) {
		            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
		            if (tempCodePoint > 0x7F) {
		              codePoint = tempCodePoint;
		            }
		          }
		          break
		        case 3:
		          secondByte = buf[i + 1];
		          thirdByte = buf[i + 2];
		          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
		            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
		            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
		              codePoint = tempCodePoint;
		            }
		          }
		          break
		        case 4:
		          secondByte = buf[i + 1];
		          thirdByte = buf[i + 2];
		          fourthByte = buf[i + 3];
		          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
		            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
		            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
		              codePoint = tempCodePoint;
		            }
		          }
		      }
		    }

		    if (codePoint === null) {
		      // we did not generate a valid codePoint so insert a
		      // replacement char (U+FFFD) and advance only 1 byte
		      codePoint = 0xFFFD;
		      bytesPerSequence = 1;
		    } else if (codePoint > 0xFFFF) {
		      // encode to utf16 (surrogate pair dance)
		      codePoint -= 0x10000;
		      res.push(codePoint >>> 10 & 0x3FF | 0xD800);
		      codePoint = 0xDC00 | codePoint & 0x3FF;
		    }

		    res.push(codePoint);
		    i += bytesPerSequence;
		  }

		  return decodeCodePointsArray(res)
		}

		// Based on http://stackoverflow.com/a/22747272/680742, the browser with
		// the lowest limit is Chrome, with 0x10000 args.
		// We go 1 magnitude less, for safety
		var MAX_ARGUMENTS_LENGTH = 0x1000;

		function decodeCodePointsArray (codePoints) {
		  var len = codePoints.length;
		  if (len <= MAX_ARGUMENTS_LENGTH) {
		    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
		  }

		  // Decode in chunks to avoid "call stack size exceeded".
		  var res = '';
		  var i = 0;
		  while (i < len) {
		    res += String.fromCharCode.apply(
		      String,
		      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
		    );
		  }
		  return res
		}

		function asciiSlice (buf, start, end) {
		  var ret = '';
		  end = Math.min(buf.length, end);

		  for (var i = start; i < end; ++i) {
		    ret += String.fromCharCode(buf[i] & 0x7F);
		  }
		  return ret
		}

		function latin1Slice (buf, start, end) {
		  var ret = '';
		  end = Math.min(buf.length, end);

		  for (var i = start; i < end; ++i) {
		    ret += String.fromCharCode(buf[i]);
		  }
		  return ret
		}

		function hexSlice (buf, start, end) {
		  var len = buf.length;

		  if (!start || start < 0) start = 0;
		  if (!end || end < 0 || end > len) end = len;

		  var out = '';
		  for (var i = start; i < end; ++i) {
		    out += hexSliceLookupTable[buf[i]];
		  }
		  return out
		}

		function utf16leSlice (buf, start, end) {
		  var bytes = buf.slice(start, end);
		  var res = '';
		  // If bytes.length is odd, the last 8 bits must be ignored (same as node.js)
		  for (var i = 0; i < bytes.length - 1; i += 2) {
		    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256));
		  }
		  return res
		}

		Buffer.prototype.slice = function slice (start, end) {
		  var len = this.length;
		  start = ~~start;
		  end = end === undefined ? len : ~~end;

		  if (start < 0) {
		    start += len;
		    if (start < 0) start = 0;
		  } else if (start > len) {
		    start = len;
		  }

		  if (end < 0) {
		    end += len;
		    if (end < 0) end = 0;
		  } else if (end > len) {
		    end = len;
		  }

		  if (end < start) end = start;

		  var newBuf = this.subarray(start, end);
		  // Return an augmented `Uint8Array` instance
		  Object.setPrototypeOf(newBuf, Buffer.prototype);

		  return newBuf
		};

		/*
		 * Need to make sure that buffer isn't trying to write out of bounds.
		 */
		function checkOffset (offset, ext, length) {
		  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
		  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
		}

		Buffer.prototype.readUintLE =
		Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
		  offset = offset >>> 0;
		  byteLength = byteLength >>> 0;
		  if (!noAssert) checkOffset(offset, byteLength, this.length);

		  var val = this[offset];
		  var mul = 1;
		  var i = 0;
		  while (++i < byteLength && (mul *= 0x100)) {
		    val += this[offset + i] * mul;
		  }

		  return val
		};

		Buffer.prototype.readUintBE =
		Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
		  offset = offset >>> 0;
		  byteLength = byteLength >>> 0;
		  if (!noAssert) {
		    checkOffset(offset, byteLength, this.length);
		  }

		  var val = this[offset + --byteLength];
		  var mul = 1;
		  while (byteLength > 0 && (mul *= 0x100)) {
		    val += this[offset + --byteLength] * mul;
		  }

		  return val
		};

		Buffer.prototype.readUint8 =
		Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 1, this.length);
		  return this[offset]
		};

		Buffer.prototype.readUint16LE =
		Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 2, this.length);
		  return this[offset] | (this[offset + 1] << 8)
		};

		Buffer.prototype.readUint16BE =
		Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 2, this.length);
		  return (this[offset] << 8) | this[offset + 1]
		};

		Buffer.prototype.readUint32LE =
		Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 4, this.length);

		  return ((this[offset]) |
		      (this[offset + 1] << 8) |
		      (this[offset + 2] << 16)) +
		      (this[offset + 3] * 0x1000000)
		};

		Buffer.prototype.readUint32BE =
		Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 4, this.length);

		  return (this[offset] * 0x1000000) +
		    ((this[offset + 1] << 16) |
		    (this[offset + 2] << 8) |
		    this[offset + 3])
		};

		Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
		  offset = offset >>> 0;
		  byteLength = byteLength >>> 0;
		  if (!noAssert) checkOffset(offset, byteLength, this.length);

		  var val = this[offset];
		  var mul = 1;
		  var i = 0;
		  while (++i < byteLength && (mul *= 0x100)) {
		    val += this[offset + i] * mul;
		  }
		  mul *= 0x80;

		  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

		  return val
		};

		Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
		  offset = offset >>> 0;
		  byteLength = byteLength >>> 0;
		  if (!noAssert) checkOffset(offset, byteLength, this.length);

		  var i = byteLength;
		  var mul = 1;
		  var val = this[offset + --i];
		  while (i > 0 && (mul *= 0x100)) {
		    val += this[offset + --i] * mul;
		  }
		  mul *= 0x80;

		  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

		  return val
		};

		Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 1, this.length);
		  if (!(this[offset] & 0x80)) return (this[offset])
		  return ((0xff - this[offset] + 1) * -1)
		};

		Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 2, this.length);
		  var val = this[offset] | (this[offset + 1] << 8);
		  return (val & 0x8000) ? val | 0xFFFF0000 : val
		};

		Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 2, this.length);
		  var val = this[offset + 1] | (this[offset] << 8);
		  return (val & 0x8000) ? val | 0xFFFF0000 : val
		};

		Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 4, this.length);

		  return (this[offset]) |
		    (this[offset + 1] << 8) |
		    (this[offset + 2] << 16) |
		    (this[offset + 3] << 24)
		};

		Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 4, this.length);

		  return (this[offset] << 24) |
		    (this[offset + 1] << 16) |
		    (this[offset + 2] << 8) |
		    (this[offset + 3])
		};

		Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 4, this.length);
		  return ieee754.read(this, offset, true, 23, 4)
		};

		Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 4, this.length);
		  return ieee754.read(this, offset, false, 23, 4)
		};

		Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 8, this.length);
		  return ieee754.read(this, offset, true, 52, 8)
		};

		Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
		  offset = offset >>> 0;
		  if (!noAssert) checkOffset(offset, 8, this.length);
		  return ieee754.read(this, offset, false, 52, 8)
		};

		function checkInt (buf, value, offset, ext, max, min) {
		  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
		  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
		  if (offset + ext > buf.length) throw new RangeError('Index out of range')
		}

		Buffer.prototype.writeUintLE =
		Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  byteLength = byteLength >>> 0;
		  if (!noAssert) {
		    var maxBytes = Math.pow(2, 8 * byteLength) - 1;
		    checkInt(this, value, offset, byteLength, maxBytes, 0);
		  }

		  var mul = 1;
		  var i = 0;
		  this[offset] = value & 0xFF;
		  while (++i < byteLength && (mul *= 0x100)) {
		    this[offset + i] = (value / mul) & 0xFF;
		  }

		  return offset + byteLength
		};

		Buffer.prototype.writeUintBE =
		Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  byteLength = byteLength >>> 0;
		  if (!noAssert) {
		    var maxBytes = Math.pow(2, 8 * byteLength) - 1;
		    checkInt(this, value, offset, byteLength, maxBytes, 0);
		  }

		  var i = byteLength - 1;
		  var mul = 1;
		  this[offset + i] = value & 0xFF;
		  while (--i >= 0 && (mul *= 0x100)) {
		    this[offset + i] = (value / mul) & 0xFF;
		  }

		  return offset + byteLength
		};

		Buffer.prototype.writeUint8 =
		Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
		  this[offset] = (value & 0xff);
		  return offset + 1
		};

		Buffer.prototype.writeUint16LE =
		Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
		  this[offset] = (value & 0xff);
		  this[offset + 1] = (value >>> 8);
		  return offset + 2
		};

		Buffer.prototype.writeUint16BE =
		Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
		  this[offset] = (value >>> 8);
		  this[offset + 1] = (value & 0xff);
		  return offset + 2
		};

		Buffer.prototype.writeUint32LE =
		Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
		  this[offset + 3] = (value >>> 24);
		  this[offset + 2] = (value >>> 16);
		  this[offset + 1] = (value >>> 8);
		  this[offset] = (value & 0xff);
		  return offset + 4
		};

		Buffer.prototype.writeUint32BE =
		Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
		  this[offset] = (value >>> 24);
		  this[offset + 1] = (value >>> 16);
		  this[offset + 2] = (value >>> 8);
		  this[offset + 3] = (value & 0xff);
		  return offset + 4
		};

		Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) {
		    var limit = Math.pow(2, (8 * byteLength) - 1);

		    checkInt(this, value, offset, byteLength, limit - 1, -limit);
		  }

		  var i = 0;
		  var mul = 1;
		  var sub = 0;
		  this[offset] = value & 0xFF;
		  while (++i < byteLength && (mul *= 0x100)) {
		    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
		      sub = 1;
		    }
		    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
		  }

		  return offset + byteLength
		};

		Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) {
		    var limit = Math.pow(2, (8 * byteLength) - 1);

		    checkInt(this, value, offset, byteLength, limit - 1, -limit);
		  }

		  var i = byteLength - 1;
		  var mul = 1;
		  var sub = 0;
		  this[offset + i] = value & 0xFF;
		  while (--i >= 0 && (mul *= 0x100)) {
		    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
		      sub = 1;
		    }
		    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
		  }

		  return offset + byteLength
		};

		Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -128);
		  if (value < 0) value = 0xff + value + 1;
		  this[offset] = (value & 0xff);
		  return offset + 1
		};

		Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -32768);
		  this[offset] = (value & 0xff);
		  this[offset + 1] = (value >>> 8);
		  return offset + 2
		};

		Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -32768);
		  this[offset] = (value >>> 8);
		  this[offset + 1] = (value & 0xff);
		  return offset + 2
		};

		Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -2147483648);
		  this[offset] = (value & 0xff);
		  this[offset + 1] = (value >>> 8);
		  this[offset + 2] = (value >>> 16);
		  this[offset + 3] = (value >>> 24);
		  return offset + 4
		};

		Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -2147483648);
		  if (value < 0) value = 0xffffffff + value + 1;
		  this[offset] = (value >>> 24);
		  this[offset + 1] = (value >>> 16);
		  this[offset + 2] = (value >>> 8);
		  this[offset + 3] = (value & 0xff);
		  return offset + 4
		};

		function checkIEEE754 (buf, value, offset, ext, max, min) {
		  if (offset + ext > buf.length) throw new RangeError('Index out of range')
		  if (offset < 0) throw new RangeError('Index out of range')
		}

		function writeFloat (buf, value, offset, littleEndian, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) {
		    checkIEEE754(buf, value, offset, 4);
		  }
		  ieee754.write(buf, value, offset, littleEndian, 23, 4);
		  return offset + 4
		}

		Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
		  return writeFloat(this, value, offset, true, noAssert)
		};

		Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
		  return writeFloat(this, value, offset, false, noAssert)
		};

		function writeDouble (buf, value, offset, littleEndian, noAssert) {
		  value = +value;
		  offset = offset >>> 0;
		  if (!noAssert) {
		    checkIEEE754(buf, value, offset, 8);
		  }
		  ieee754.write(buf, value, offset, littleEndian, 52, 8);
		  return offset + 8
		}

		Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
		  return writeDouble(this, value, offset, true, noAssert)
		};

		Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
		  return writeDouble(this, value, offset, false, noAssert)
		};

		// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
		Buffer.prototype.copy = function copy (target, targetStart, start, end) {
		  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
		  if (!start) start = 0;
		  if (!end && end !== 0) end = this.length;
		  if (targetStart >= target.length) targetStart = target.length;
		  if (!targetStart) targetStart = 0;
		  if (end > 0 && end < start) end = start;

		  // Copy 0 bytes; we're done
		  if (end === start) return 0
		  if (target.length === 0 || this.length === 0) return 0

		  // Fatal error conditions
		  if (targetStart < 0) {
		    throw new RangeError('targetStart out of bounds')
		  }
		  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
		  if (end < 0) throw new RangeError('sourceEnd out of bounds')

		  // Are we oob?
		  if (end > this.length) end = this.length;
		  if (target.length - targetStart < end - start) {
		    end = target.length - targetStart + start;
		  }

		  var len = end - start;

		  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
		    // Use built-in when available, missing from IE11
		    this.copyWithin(targetStart, start, end);
		  } else {
		    Uint8Array.prototype.set.call(
		      target,
		      this.subarray(start, end),
		      targetStart
		    );
		  }

		  return len
		};

		// Usage:
		//    buffer.fill(number[, offset[, end]])
		//    buffer.fill(buffer[, offset[, end]])
		//    buffer.fill(string[, offset[, end]][, encoding])
		Buffer.prototype.fill = function fill (val, start, end, encoding) {
		  // Handle string cases:
		  if (typeof val === 'string') {
		    if (typeof start === 'string') {
		      encoding = start;
		      start = 0;
		      end = this.length;
		    } else if (typeof end === 'string') {
		      encoding = end;
		      end = this.length;
		    }
		    if (encoding !== undefined && typeof encoding !== 'string') {
		      throw new TypeError('encoding must be a string')
		    }
		    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
		      throw new TypeError('Unknown encoding: ' + encoding)
		    }
		    if (val.length === 1) {
		      var code = val.charCodeAt(0);
		      if ((encoding === 'utf8' && code < 128) ||
		          encoding === 'latin1') {
		        // Fast path: If `val` fits into a single byte, use that numeric value.
		        val = code;
		      }
		    }
		  } else if (typeof val === 'number') {
		    val = val & 255;
		  } else if (typeof val === 'boolean') {
		    val = Number(val);
		  }

		  // Invalid ranges are not set to a default, so can range check early.
		  if (start < 0 || this.length < start || this.length < end) {
		    throw new RangeError('Out of range index')
		  }

		  if (end <= start) {
		    return this
		  }

		  start = start >>> 0;
		  end = end === undefined ? this.length : end >>> 0;

		  if (!val) val = 0;

		  var i;
		  if (typeof val === 'number') {
		    for (i = start; i < end; ++i) {
		      this[i] = val;
		    }
		  } else {
		    var bytes = Buffer.isBuffer(val)
		      ? val
		      : Buffer.from(val, encoding);
		    var len = bytes.length;
		    if (len === 0) {
		      throw new TypeError('The value "' + val +
		        '" is invalid for argument "value"')
		    }
		    for (i = 0; i < end - start; ++i) {
		      this[i + start] = bytes[i % len];
		    }
		  }

		  return this
		};

		// HELPER FUNCTIONS
		// ================

		var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;

		function base64clean (str) {
		  // Node takes equal signs as end of the Base64 encoding
		  str = str.split('=')[0];
		  // Node strips out invalid characters like \n and \t from the string, base64-js does not
		  str = str.trim().replace(INVALID_BASE64_RE, '');
		  // Node converts strings with length < 2 to ''
		  if (str.length < 2) return ''
		  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
		  while (str.length % 4 !== 0) {
		    str = str + '=';
		  }
		  return str
		}

		function utf8ToBytes (string, units) {
		  units = units || Infinity;
		  var codePoint;
		  var length = string.length;
		  var leadSurrogate = null;
		  var bytes = [];

		  for (var i = 0; i < length; ++i) {
		    codePoint = string.charCodeAt(i);

		    // is surrogate component
		    if (codePoint > 0xD7FF && codePoint < 0xE000) {
		      // last char was a lead
		      if (!leadSurrogate) {
		        // no lead yet
		        if (codePoint > 0xDBFF) {
		          // unexpected trail
		          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
		          continue
		        } else if (i + 1 === length) {
		          // unpaired lead
		          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
		          continue
		        }

		        // valid lead
		        leadSurrogate = codePoint;

		        continue
		      }

		      // 2 leads in a row
		      if (codePoint < 0xDC00) {
		        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
		        leadSurrogate = codePoint;
		        continue
		      }

		      // valid surrogate pair
		      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
		    } else if (leadSurrogate) {
		      // valid bmp char, but last char was a lead
		      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
		    }

		    leadSurrogate = null;

		    // encode utf8
		    if (codePoint < 0x80) {
		      if ((units -= 1) < 0) break
		      bytes.push(codePoint);
		    } else if (codePoint < 0x800) {
		      if ((units -= 2) < 0) break
		      bytes.push(
		        codePoint >> 0x6 | 0xC0,
		        codePoint & 0x3F | 0x80
		      );
		    } else if (codePoint < 0x10000) {
		      if ((units -= 3) < 0) break
		      bytes.push(
		        codePoint >> 0xC | 0xE0,
		        codePoint >> 0x6 & 0x3F | 0x80,
		        codePoint & 0x3F | 0x80
		      );
		    } else if (codePoint < 0x110000) {
		      if ((units -= 4) < 0) break
		      bytes.push(
		        codePoint >> 0x12 | 0xF0,
		        codePoint >> 0xC & 0x3F | 0x80,
		        codePoint >> 0x6 & 0x3F | 0x80,
		        codePoint & 0x3F | 0x80
		      );
		    } else {
		      throw new Error('Invalid code point')
		    }
		  }

		  return bytes
		}

		function asciiToBytes (str) {
		  var byteArray = [];
		  for (var i = 0; i < str.length; ++i) {
		    // Node's code seems to be doing this and not & 0x7F..
		    byteArray.push(str.charCodeAt(i) & 0xFF);
		  }
		  return byteArray
		}

		function utf16leToBytes (str, units) {
		  var c, hi, lo;
		  var byteArray = [];
		  for (var i = 0; i < str.length; ++i) {
		    if ((units -= 2) < 0) break

		    c = str.charCodeAt(i);
		    hi = c >> 8;
		    lo = c % 256;
		    byteArray.push(lo);
		    byteArray.push(hi);
		  }

		  return byteArray
		}

		function base64ToBytes (str) {
		  return base64.toByteArray(base64clean(str))
		}

		function blitBuffer (src, dst, offset, length) {
		  for (var i = 0; i < length; ++i) {
		    if ((i + offset >= dst.length) || (i >= src.length)) break
		    dst[i + offset] = src[i];
		  }
		  return i
		}

		// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
		// the `instanceof` check but they should be treated as of that type.
		// See: https://github.com/feross/buffer/issues/166
		function isInstance (obj, type) {
		  return obj instanceof type ||
		    (obj != null && obj.constructor != null && obj.constructor.name != null &&
		      obj.constructor.name === type.name)
		}
		function numberIsNaN (obj) {
		  // For IE11 support
		  return obj !== obj // eslint-disable-line no-self-compare
		}

		// Create lookup table for `toString('hex')`
		// See: https://github.com/feross/buffer/issues/219
		var hexSliceLookupTable = (function () {
		  var alphabet = '0123456789abcdef';
		  var table = new Array(256);
		  for (var i = 0; i < 16; ++i) {
		    var i16 = i * 16;
		    for (var j = 0; j < 16; ++j) {
		      table[i16 + j] = alphabet[i] + alphabet[j];
		    }
		  }
		  return table
		})(); 
	} (buffer));
	return buffer;
}

var bufferExports = requireBuffer();

var Codecs = {};

var Frames = {};

var hasRequiredFrames;

function requireFrames () {
	if (hasRequiredFrames) return Frames;
	hasRequiredFrames = 1;
	(function (exports$1) {
		/*
		 * Copyright 2021-2022 the original author or authors.
		 *
		 * Licensed under the Apache License, Version 2.0 (the "License");
		 * you may not use this file except in compliance with the License.
		 * You may obtain a copy of the License at
		 *
		 *     http://www.apache.org/licenses/LICENSE-2.0
		 *
		 * Unless required by applicable law or agreed to in writing, software
		 * distributed under the License is distributed on an "AS IS" BASIS,
		 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
		 * See the License for the specific language governing permissions and
		 * limitations under the License.
		 */
		Object.defineProperty(exports$1, "__esModule", { value: true });
		exports$1.Frame = exports$1.Lengths = exports$1.Flags = exports$1.FrameTypes = void 0;
		var FrameTypes;
		(function (FrameTypes) {
		    FrameTypes[FrameTypes["RESERVED"] = 0] = "RESERVED";
		    FrameTypes[FrameTypes["SETUP"] = 1] = "SETUP";
		    FrameTypes[FrameTypes["LEASE"] = 2] = "LEASE";
		    FrameTypes[FrameTypes["KEEPALIVE"] = 3] = "KEEPALIVE";
		    FrameTypes[FrameTypes["REQUEST_RESPONSE"] = 4] = "REQUEST_RESPONSE";
		    FrameTypes[FrameTypes["REQUEST_FNF"] = 5] = "REQUEST_FNF";
		    FrameTypes[FrameTypes["REQUEST_STREAM"] = 6] = "REQUEST_STREAM";
		    FrameTypes[FrameTypes["REQUEST_CHANNEL"] = 7] = "REQUEST_CHANNEL";
		    FrameTypes[FrameTypes["REQUEST_N"] = 8] = "REQUEST_N";
		    FrameTypes[FrameTypes["CANCEL"] = 9] = "CANCEL";
		    FrameTypes[FrameTypes["PAYLOAD"] = 10] = "PAYLOAD";
		    FrameTypes[FrameTypes["ERROR"] = 11] = "ERROR";
		    FrameTypes[FrameTypes["METADATA_PUSH"] = 12] = "METADATA_PUSH";
		    FrameTypes[FrameTypes["RESUME"] = 13] = "RESUME";
		    FrameTypes[FrameTypes["RESUME_OK"] = 14] = "RESUME_OK";
		    FrameTypes[FrameTypes["EXT"] = 63] = "EXT";
		})(FrameTypes = exports$1.FrameTypes || (exports$1.FrameTypes = {}));
		(function (Flags) {
		    Flags[Flags["NONE"] = 0] = "NONE";
		    Flags[Flags["COMPLETE"] = 64] = "COMPLETE";
		    Flags[Flags["FOLLOWS"] = 128] = "FOLLOWS";
		    Flags[Flags["IGNORE"] = 512] = "IGNORE";
		    Flags[Flags["LEASE"] = 64] = "LEASE";
		    Flags[Flags["METADATA"] = 256] = "METADATA";
		    Flags[Flags["NEXT"] = 32] = "NEXT";
		    Flags[Flags["RESPOND"] = 128] = "RESPOND";
		    Flags[Flags["RESUME_ENABLE"] = 128] = "RESUME_ENABLE";
		})(exports$1.Flags || (exports$1.Flags = {}));
		(function (Flags) {
		    function hasMetadata(flags) {
		        return (flags & Flags.METADATA) === Flags.METADATA;
		    }
		    Flags.hasMetadata = hasMetadata;
		    function hasComplete(flags) {
		        return (flags & Flags.COMPLETE) === Flags.COMPLETE;
		    }
		    Flags.hasComplete = hasComplete;
		    function hasNext(flags) {
		        return (flags & Flags.NEXT) === Flags.NEXT;
		    }
		    Flags.hasNext = hasNext;
		    function hasFollows(flags) {
		        return (flags & Flags.FOLLOWS) === Flags.FOLLOWS;
		    }
		    Flags.hasFollows = hasFollows;
		    function hasIgnore(flags) {
		        return (flags & Flags.IGNORE) === Flags.IGNORE;
		    }
		    Flags.hasIgnore = hasIgnore;
		    function hasRespond(flags) {
		        return (flags & Flags.RESPOND) === Flags.RESPOND;
		    }
		    Flags.hasRespond = hasRespond;
		    function hasLease(flags) {
		        return (flags & Flags.LEASE) === Flags.LEASE;
		    }
		    Flags.hasLease = hasLease;
		    function hasResume(flags) {
		        return (flags & Flags.RESUME_ENABLE) === Flags.RESUME_ENABLE;
		    }
		    Flags.hasResume = hasResume;
		})(exports$1.Flags || (exports$1.Flags = {}));
		(function (Lengths) {
		    Lengths[Lengths["FRAME"] = 3] = "FRAME";
		    Lengths[Lengths["HEADER"] = 6] = "HEADER";
		    Lengths[Lengths["METADATA"] = 3] = "METADATA";
		    Lengths[Lengths["REQUEST"] = 3] = "REQUEST";
		})(exports$1.Lengths || (exports$1.Lengths = {}));
		(function (Frame) {
		    function isConnection(frame) {
		        return frame.streamId === 0;
		    }
		    Frame.isConnection = isConnection;
		    function isRequest(frame) {
		        return (FrameTypes.REQUEST_RESPONSE <= frame.type &&
		            frame.type <= FrameTypes.REQUEST_CHANNEL);
		    }
		    Frame.isRequest = isRequest;
		})(exports$1.Frame || (exports$1.Frame = {}));
		
	} (Frames));
	return Frames;
}

var hasRequiredCodecs;

function requireCodecs () {
	if (hasRequiredCodecs) return Codecs;
	hasRequiredCodecs = 1;
	(function (exports$1) {
		var __generator = (Codecs && Codecs.__generator) || function (thisArg, body) {
		    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
		    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
		    function verb(n) { return function (v) { return step([n, v]); }; }
		    function step(op) {
		        if (f) throw new TypeError("Generator is already executing.");
		        while (_) try {
		            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
		            if (y = 0, t) op = [op[0] & 2, t.value];
		            switch (op[0]) {
		                case 0: case 1: t = op; break;
		                case 4: _.label++; return { value: op[1], done: false };
		                case 5: _.label++; y = op[1]; op = [0]; continue;
		                case 7: op = _.ops.pop(); _.trys.pop(); continue;
		                default:
		                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
		                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
		                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
		                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
		                    if (t[2]) _.ops.pop();
		                    _.trys.pop(); continue;
		            }
		            op = body.call(thisArg, _);
		        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
		        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
		    }
		};
		Object.defineProperty(exports$1, "__esModule", { value: true });
		exports$1.Deserializer = exports$1.sizeOfFrame = exports$1.serializeFrame = exports$1.deserializeFrame = exports$1.serializeFrameWithLength = exports$1.deserializeFrames = exports$1.deserializeFrameWithLength = exports$1.writeUInt64BE = exports$1.readUInt64BE = exports$1.writeUInt24BE = exports$1.readUInt24BE = exports$1.MAX_VERSION = exports$1.MAX_TTL = exports$1.MAX_STREAM_ID = exports$1.MAX_RESUME_LENGTH = exports$1.MAX_REQUEST_N = exports$1.MAX_REQUEST_COUNT = exports$1.MAX_MIME_LENGTH = exports$1.MAX_METADATA_LENGTH = exports$1.MAX_LIFETIME = exports$1.MAX_KEEPALIVE = exports$1.MAX_CODE = exports$1.FRAME_TYPE_OFFFSET = exports$1.FLAGS_MASK = void 0;
		var Frames_1 = requireFrames();
		exports$1.FLAGS_MASK = 0x3ff; // low 10 bits
		exports$1.FRAME_TYPE_OFFFSET = 10; // frame type is offset 10 bytes within the uint16 containing type + flags
		exports$1.MAX_CODE = 0x7fffffff; // uint31
		exports$1.MAX_KEEPALIVE = 0x7fffffff; // uint31
		exports$1.MAX_LIFETIME = 0x7fffffff; // uint31
		exports$1.MAX_METADATA_LENGTH = 0xffffff; // uint24
		exports$1.MAX_MIME_LENGTH = 0xff; // int8
		exports$1.MAX_REQUEST_COUNT = 0x7fffffff; // uint31
		exports$1.MAX_REQUEST_N = 0x7fffffff; // uint31
		exports$1.MAX_RESUME_LENGTH = 0xffff; // uint16
		exports$1.MAX_STREAM_ID = 0x7fffffff; // uint31
		exports$1.MAX_TTL = 0x7fffffff; // uint31
		exports$1.MAX_VERSION = 0xffff; // uint16
		/**
		 * Mimimum value that would overflow bitwise operators (2^32).
		 */
		var BITWISE_OVERFLOW = 0x100000000;
		/**
		 * Read a uint24 from a buffer starting at the given offset.
		 */
		function readUInt24BE(buffer, offset) {
		    var val1 = buffer.readUInt8(offset) << 16;
		    var val2 = buffer.readUInt8(offset + 1) << 8;
		    var val3 = buffer.readUInt8(offset + 2);
		    return val1 | val2 | val3;
		}
		exports$1.readUInt24BE = readUInt24BE;
		/**
		 * Writes a uint24 to a buffer starting at the given offset, returning the
		 * offset of the next byte.
		 */
		function writeUInt24BE(buffer, value, offset) {
		    offset = buffer.writeUInt8(value >>> 16, offset); // 3rd byte
		    offset = buffer.writeUInt8((value >>> 8) & 0xff, offset); // 2nd byte
		    return buffer.writeUInt8(value & 0xff, offset); // 1st byte
		}
		exports$1.writeUInt24BE = writeUInt24BE;
		/**
		 * Read a uint64 (technically supports up to 53 bits per JS number
		 * representation).
		 */
		function readUInt64BE(buffer, offset) {
		    var high = buffer.readUInt32BE(offset);
		    var low = buffer.readUInt32BE(offset + 4);
		    return high * BITWISE_OVERFLOW + low;
		}
		exports$1.readUInt64BE = readUInt64BE;
		/**
		 * Write a uint64 (technically supports up to 53 bits per JS number
		 * representation).
		 */
		function writeUInt64BE(buffer, value, offset) {
		    var high = (value / BITWISE_OVERFLOW) | 0;
		    var low = value % BITWISE_OVERFLOW;
		    offset = buffer.writeUInt32BE(high, offset); // first half of uint64
		    return buffer.writeUInt32BE(low, offset); // second half of uint64
		}
		exports$1.writeUInt64BE = writeUInt64BE;
		/**
		 * Frame header is:
		 * - stream id (uint32 = 4)
		 * - type + flags (uint 16 = 2)
		 */
		var FRAME_HEADER_SIZE = 6;
		/**
		 * Size of frame length and metadata length fields.
		 */
		var UINT24_SIZE = 3;
		/**
		 * Reads a frame from a buffer that is prefixed with the frame length.
		 */
		function deserializeFrameWithLength(buffer) {
		    var frameLength = readUInt24BE(buffer, 0);
		    return deserializeFrame(buffer.slice(UINT24_SIZE, UINT24_SIZE + frameLength));
		}
		exports$1.deserializeFrameWithLength = deserializeFrameWithLength;
		/**
		 * Given a buffer that may contain zero or more length-prefixed frames followed
		 * by zero or more bytes of a (partial) subsequent frame, returns an array of
		 * the frames and an int representing the buffer offset.
		 */
		function deserializeFrames(buffer) {
		    var offset, frameLength, frameStart, frameEnd, frameBuffer, frame;
		    return __generator(this, function (_a) {
		        switch (_a.label) {
		            case 0:
		                offset = 0;
		                _a.label = 1;
		            case 1:
		                if (!(offset + UINT24_SIZE < buffer.length)) return [3 /*break*/, 3];
		                frameLength = readUInt24BE(buffer, offset);
		                frameStart = offset + UINT24_SIZE;
		                frameEnd = frameStart + frameLength;
		                if (frameEnd > buffer.length) {
		                    // not all bytes of next frame received
		                    return [3 /*break*/, 3];
		                }
		                frameBuffer = buffer.slice(frameStart, frameEnd);
		                frame = deserializeFrame(frameBuffer);
		                offset = frameEnd;
		                return [4 /*yield*/, [frame, offset]];
		            case 2:
		                _a.sent();
		                return [3 /*break*/, 1];
		            case 3: return [2 /*return*/];
		        }
		    });
		}
		exports$1.deserializeFrames = deserializeFrames;
		/**
		 * Writes a frame to a buffer with a length prefix.
		 */
		function serializeFrameWithLength(frame) {
		    var buffer = serializeFrame(frame);
		    var lengthPrefixed = bufferExports.Buffer.allocUnsafe(buffer.length + UINT24_SIZE);
		    writeUInt24BE(lengthPrefixed, buffer.length, 0);
		    buffer.copy(lengthPrefixed, UINT24_SIZE);
		    return lengthPrefixed;
		}
		exports$1.serializeFrameWithLength = serializeFrameWithLength;
		/**
		 * Read a frame from the buffer.
		 */
		function deserializeFrame(buffer) {
		    var offset = 0;
		    var streamId = buffer.readInt32BE(offset);
		    offset += 4;
		    // invariant(
		    //   streamId >= 0,
		    //   'RSocketBinaryFraming: Invalid frame, expected a positive stream id, got `%s.',
		    //   streamId,
		    // );
		    var typeAndFlags = buffer.readUInt16BE(offset);
		    offset += 2;
		    var type = typeAndFlags >>> exports$1.FRAME_TYPE_OFFFSET; // keep highest 6 bits
		    var flags = typeAndFlags & exports$1.FLAGS_MASK; // keep lowest 10 bits
		    switch (type) {
		        case Frames_1.FrameTypes.SETUP:
		            return deserializeSetupFrame(buffer, streamId, flags);
		        case Frames_1.FrameTypes.PAYLOAD:
		            return deserializePayloadFrame(buffer, streamId, flags);
		        case Frames_1.FrameTypes.ERROR:
		            return deserializeErrorFrame(buffer, streamId, flags);
		        case Frames_1.FrameTypes.KEEPALIVE:
		            return deserializeKeepAliveFrame(buffer, streamId, flags);
		        case Frames_1.FrameTypes.REQUEST_FNF:
		            return deserializeRequestFnfFrame(buffer, streamId, flags);
		        case Frames_1.FrameTypes.REQUEST_RESPONSE:
		            return deserializeRequestResponseFrame(buffer, streamId, flags);
		        case Frames_1.FrameTypes.REQUEST_STREAM:
		            return deserializeRequestStreamFrame(buffer, streamId, flags);
		        case Frames_1.FrameTypes.REQUEST_CHANNEL:
		            return deserializeRequestChannelFrame(buffer, streamId, flags);
		        case Frames_1.FrameTypes.METADATA_PUSH:
		            return deserializeMetadataPushFrame(buffer, streamId, flags);
		        case Frames_1.FrameTypes.REQUEST_N:
		            return deserializeRequestNFrame(buffer, streamId, flags);
		        case Frames_1.FrameTypes.RESUME:
		            return deserializeResumeFrame(buffer, streamId, flags);
		        case Frames_1.FrameTypes.RESUME_OK:
		            return deserializeResumeOkFrame(buffer, streamId, flags);
		        case Frames_1.FrameTypes.CANCEL:
		            return deserializeCancelFrame(buffer, streamId, flags);
		        case Frames_1.FrameTypes.LEASE:
		            return deserializeLeaseFrame(buffer, streamId, flags);
		        // invariant(
		        //   false,
		        //   "RSocketBinaryFraming: Unsupported frame type `%s`.",
		        //   getFrameTypeName(type)
		        // );
		    }
		}
		exports$1.deserializeFrame = deserializeFrame;
		/**
		 * Convert the frame to a (binary) buffer.
		 */
		function serializeFrame(frame) {
		    switch (frame.type) {
		        case Frames_1.FrameTypes.SETUP:
		            return serializeSetupFrame(frame);
		        case Frames_1.FrameTypes.PAYLOAD:
		            return serializePayloadFrame(frame);
		        case Frames_1.FrameTypes.ERROR:
		            return serializeErrorFrame(frame);
		        case Frames_1.FrameTypes.KEEPALIVE:
		            return serializeKeepAliveFrame(frame);
		        case Frames_1.FrameTypes.REQUEST_FNF:
		        case Frames_1.FrameTypes.REQUEST_RESPONSE:
		            return serializeRequestFrame(frame);
		        case Frames_1.FrameTypes.REQUEST_STREAM:
		        case Frames_1.FrameTypes.REQUEST_CHANNEL:
		            return serializeRequestManyFrame(frame);
		        case Frames_1.FrameTypes.METADATA_PUSH:
		            return serializeMetadataPushFrame(frame);
		        case Frames_1.FrameTypes.REQUEST_N:
		            return serializeRequestNFrame(frame);
		        case Frames_1.FrameTypes.RESUME:
		            return serializeResumeFrame(frame);
		        case Frames_1.FrameTypes.RESUME_OK:
		            return serializeResumeOkFrame(frame);
		        case Frames_1.FrameTypes.CANCEL:
		            return serializeCancelFrame(frame);
		        case Frames_1.FrameTypes.LEASE:
		            return serializeLeaseFrame(frame);
		        // invariant(
		        //   false,
		        //   "RSocketBinaryFraming: Unsupported frame type `%s`.",
		        //   getFrameTypeName(frame.type)
		        // );
		    }
		}
		exports$1.serializeFrame = serializeFrame;
		/**
		 * Byte size of frame without size prefix
		 */
		function sizeOfFrame(frame) {
		    switch (frame.type) {
		        case Frames_1.FrameTypes.SETUP:
		            return sizeOfSetupFrame(frame);
		        case Frames_1.FrameTypes.PAYLOAD:
		            return sizeOfPayloadFrame(frame);
		        case Frames_1.FrameTypes.ERROR:
		            return sizeOfErrorFrame(frame);
		        case Frames_1.FrameTypes.KEEPALIVE:
		            return sizeOfKeepAliveFrame(frame);
		        case Frames_1.FrameTypes.REQUEST_FNF:
		        case Frames_1.FrameTypes.REQUEST_RESPONSE:
		            return sizeOfRequestFrame(frame);
		        case Frames_1.FrameTypes.REQUEST_STREAM:
		        case Frames_1.FrameTypes.REQUEST_CHANNEL:
		            return sizeOfRequestManyFrame(frame);
		        case Frames_1.FrameTypes.METADATA_PUSH:
		            return sizeOfMetadataPushFrame(frame);
		        case Frames_1.FrameTypes.REQUEST_N:
		            return sizeOfRequestNFrame();
		        case Frames_1.FrameTypes.RESUME:
		            return sizeOfResumeFrame(frame);
		        case Frames_1.FrameTypes.RESUME_OK:
		            return sizeOfResumeOkFrame();
		        case Frames_1.FrameTypes.CANCEL:
		            return sizeOfCancelFrame();
		        case Frames_1.FrameTypes.LEASE:
		            return sizeOfLeaseFrame(frame);
		        // invariant(
		        //   false,
		        //   "RSocketBinaryFraming: Unsupported frame type `%s`.",
		        //   getFrameTypeName(frame.type)
		        // );
		    }
		}
		exports$1.sizeOfFrame = sizeOfFrame;
		/**
		 * Writes a SETUP frame into a new buffer and returns it.
		 *
		 * Prefix size is:
		 * - version (2x uint16 = 4)
		 * - keepalive (uint32 = 4)
		 * - lifetime (uint32 = 4)
		 * - mime lengths (2x uint8 = 2)
		 */
		var SETUP_FIXED_SIZE = 14;
		var RESUME_TOKEN_LENGTH_SIZE = 2;
		function serializeSetupFrame(frame) {
		    var resumeTokenLength = frame.resumeToken != null ? frame.resumeToken.byteLength : 0;
		    var metadataMimeTypeLength = frame.metadataMimeType != null
		        ? bufferExports.Buffer.byteLength(frame.metadataMimeType, "ascii")
		        : 0;
		    var dataMimeTypeLength = frame.dataMimeType != null
		        ? bufferExports.Buffer.byteLength(frame.dataMimeType, "ascii")
		        : 0;
		    var payloadLength = getPayloadLength(frame);
		    var buffer = bufferExports.Buffer.allocUnsafe(FRAME_HEADER_SIZE +
		        SETUP_FIXED_SIZE + //
		        (resumeTokenLength ? RESUME_TOKEN_LENGTH_SIZE + resumeTokenLength : 0) +
		        metadataMimeTypeLength +
		        dataMimeTypeLength +
		        payloadLength);
		    var offset = writeHeader(frame, buffer);
		    offset = buffer.writeUInt16BE(frame.majorVersion, offset);
		    offset = buffer.writeUInt16BE(frame.minorVersion, offset);
		    offset = buffer.writeUInt32BE(frame.keepAlive, offset);
		    offset = buffer.writeUInt32BE(frame.lifetime, offset);
		    if (frame.flags & Frames_1.Flags.RESUME_ENABLE) {
		        offset = buffer.writeUInt16BE(resumeTokenLength, offset);
		        if (frame.resumeToken != null) {
		            offset += frame.resumeToken.copy(buffer, offset);
		        }
		    }
		    offset = buffer.writeUInt8(metadataMimeTypeLength, offset);
		    if (frame.metadataMimeType != null) {
		        offset += buffer.write(frame.metadataMimeType, offset, offset + metadataMimeTypeLength, "ascii");
		    }
		    offset = buffer.writeUInt8(dataMimeTypeLength, offset);
		    if (frame.dataMimeType != null) {
		        offset += buffer.write(frame.dataMimeType, offset, offset + dataMimeTypeLength, "ascii");
		    }
		    writePayload(frame, buffer, offset);
		    return buffer;
		}
		function sizeOfSetupFrame(frame) {
		    var resumeTokenLength = frame.resumeToken != null ? frame.resumeToken.byteLength : 0;
		    var metadataMimeTypeLength = frame.metadataMimeType != null
		        ? bufferExports.Buffer.byteLength(frame.metadataMimeType, "ascii")
		        : 0;
		    var dataMimeTypeLength = frame.dataMimeType != null
		        ? bufferExports.Buffer.byteLength(frame.dataMimeType, "ascii")
		        : 0;
		    var payloadLength = getPayloadLength(frame);
		    return (FRAME_HEADER_SIZE +
		        SETUP_FIXED_SIZE + //
		        (resumeTokenLength ? RESUME_TOKEN_LENGTH_SIZE + resumeTokenLength : 0) +
		        metadataMimeTypeLength +
		        dataMimeTypeLength +
		        payloadLength);
		}
		/**
		 * Reads a SETUP frame from the buffer and returns it.
		 */
		function deserializeSetupFrame(buffer, streamId, flags) {
		    // invariant(
		    //   streamId === 0,
		    //   'RSocketBinaryFraming: Invalid SETUP frame, expected stream id to be 0.',
		    // );
		    buffer.length;
		    var offset = FRAME_HEADER_SIZE;
		    var majorVersion = buffer.readUInt16BE(offset);
		    offset += 2;
		    var minorVersion = buffer.readUInt16BE(offset);
		    offset += 2;
		    var keepAlive = buffer.readInt32BE(offset);
		    offset += 4;
		    // invariant(
		    //   keepAlive >= 0 && keepAlive <= MAX_KEEPALIVE,
		    //   'RSocketBinaryFraming: Invalid SETUP frame, expected keepAlive to be ' +
		    //     '>= 0 and <= %s. Got `%s`.',
		    //   MAX_KEEPALIVE,
		    //   keepAlive,
		    // );
		    var lifetime = buffer.readInt32BE(offset);
		    offset += 4;
		    // invariant(
		    //   lifetime >= 0 && lifetime <= MAX_LIFETIME,
		    //   'RSocketBinaryFraming: Invalid SETUP frame, expected lifetime to be ' +
		    //     '>= 0 and <= %s. Got `%s`.',
		    //   MAX_LIFETIME,
		    //   lifetime,
		    // );
		    var resumeToken = null;
		    if (flags & Frames_1.Flags.RESUME_ENABLE) {
		        var resumeTokenLength = buffer.readInt16BE(offset);
		        offset += 2;
		        // invariant(
		        //   resumeTokenLength >= 0 && resumeTokenLength <= MAX_RESUME_LENGTH,
		        //   'RSocketBinaryFraming: Invalid SETUP frame, expected resumeToken length ' +
		        //     'to be >= 0 and <= %s. Got `%s`.',
		        //   MAX_RESUME_LENGTH,
		        //   resumeTokenLength,
		        // );
		        resumeToken = buffer.slice(offset, offset + resumeTokenLength);
		        offset += resumeTokenLength;
		    }
		    var metadataMimeTypeLength = buffer.readUInt8(offset);
		    offset += 1;
		    var metadataMimeType = buffer.toString("ascii", offset, offset + metadataMimeTypeLength);
		    offset += metadataMimeTypeLength;
		    var dataMimeTypeLength = buffer.readUInt8(offset);
		    offset += 1;
		    var dataMimeType = buffer.toString("ascii", offset, offset + dataMimeTypeLength);
		    offset += dataMimeTypeLength;
		    var frame = {
		        data: null,
		        dataMimeType: dataMimeType,
		        flags: flags,
		        keepAlive: keepAlive,
		        lifetime: lifetime,
		        majorVersion: majorVersion,
		        metadata: null,
		        metadataMimeType: metadataMimeType,
		        minorVersion: minorVersion,
		        resumeToken: resumeToken,
		        // streamId,
		        streamId: 0,
		        type: Frames_1.FrameTypes.SETUP,
		    };
		    readPayload(buffer, frame, offset);
		    return frame;
		}
		/**
		 * Writes an ERROR frame into a new buffer and returns it.
		 *
		 * Prefix size is for the error code (uint32 = 4).
		 */
		var ERROR_FIXED_SIZE = 4;
		function serializeErrorFrame(frame) {
		    var messageLength = frame.message != null ? bufferExports.Buffer.byteLength(frame.message, "utf8") : 0;
		    var buffer = bufferExports.Buffer.allocUnsafe(FRAME_HEADER_SIZE + ERROR_FIXED_SIZE + messageLength);
		    var offset = writeHeader(frame, buffer);
		    offset = buffer.writeUInt32BE(frame.code, offset);
		    if (frame.message != null) {
		        buffer.write(frame.message, offset, offset + messageLength, "utf8");
		    }
		    return buffer;
		}
		function sizeOfErrorFrame(frame) {
		    var messageLength = frame.message != null ? bufferExports.Buffer.byteLength(frame.message, "utf8") : 0;
		    return FRAME_HEADER_SIZE + ERROR_FIXED_SIZE + messageLength;
		}
		/**
		 * Reads an ERROR frame from the buffer and returns it.
		 */
		function deserializeErrorFrame(buffer, streamId, flags) {
		    buffer.length;
		    var offset = FRAME_HEADER_SIZE;
		    var code = buffer.readInt32BE(offset);
		    offset += 4;
		    // invariant(
		    //   code >= 0 && code <= MAX_CODE,
		    //   "RSocketBinaryFraming: Invalid ERROR frame, expected code to be >= 0 and <= %s. Got `%s`.",
		    //   MAX_CODE,
		    //   code
		    // );
		    var messageLength = buffer.length - offset;
		    var message = "";
		    if (messageLength > 0) {
		        message = buffer.toString("utf8", offset, offset + messageLength);
		        offset += messageLength;
		    }
		    return {
		        code: code,
		        flags: flags,
		        message: message,
		        streamId: streamId,
		        type: Frames_1.FrameTypes.ERROR,
		    };
		}
		/**
		 * Writes a KEEPALIVE frame into a new buffer and returns it.
		 *
		 * Prefix size is for the last received position (uint64 = 8).
		 */
		var KEEPALIVE_FIXED_SIZE = 8;
		function serializeKeepAliveFrame(frame) {
		    var dataLength = frame.data != null ? frame.data.byteLength : 0;
		    var buffer = bufferExports.Buffer.allocUnsafe(FRAME_HEADER_SIZE + KEEPALIVE_FIXED_SIZE + dataLength);
		    var offset = writeHeader(frame, buffer);
		    offset = writeUInt64BE(buffer, frame.lastReceivedPosition, offset);
		    if (frame.data != null) {
		        frame.data.copy(buffer, offset);
		    }
		    return buffer;
		}
		function sizeOfKeepAliveFrame(frame) {
		    var dataLength = frame.data != null ? frame.data.byteLength : 0;
		    return FRAME_HEADER_SIZE + KEEPALIVE_FIXED_SIZE + dataLength;
		}
		/**
		 * Reads a KEEPALIVE frame from the buffer and returns it.
		 */
		function deserializeKeepAliveFrame(buffer, streamId, flags) {
		    // invariant(
		    //   streamId === 0,
		    //   "RSocketBinaryFraming: Invalid KEEPALIVE frame, expected stream id to be 0."
		    // );
		    buffer.length;
		    var offset = FRAME_HEADER_SIZE;
		    var lastReceivedPosition = readUInt64BE(buffer, offset);
		    offset += 8;
		    var data = null;
		    if (offset < buffer.length) {
		        data = buffer.slice(offset, buffer.length);
		    }
		    return {
		        data: data,
		        flags: flags,
		        lastReceivedPosition: lastReceivedPosition,
		        // streamId,
		        streamId: 0,
		        type: Frames_1.FrameTypes.KEEPALIVE,
		    };
		}
		/**
		 * Writes a LEASE frame into a new buffer and returns it.
		 *
		 * Prefix size is for the ttl (uint32) and requestcount (uint32).
		 */
		var LEASE_FIXED_SIZE = 8;
		function serializeLeaseFrame(frame) {
		    var metaLength = frame.metadata != null ? frame.metadata.byteLength : 0;
		    var buffer = bufferExports.Buffer.allocUnsafe(FRAME_HEADER_SIZE + LEASE_FIXED_SIZE + metaLength);
		    var offset = writeHeader(frame, buffer);
		    offset = buffer.writeUInt32BE(frame.ttl, offset);
		    offset = buffer.writeUInt32BE(frame.requestCount, offset);
		    if (frame.metadata != null) {
		        frame.metadata.copy(buffer, offset);
		    }
		    return buffer;
		}
		function sizeOfLeaseFrame(frame) {
		    var metaLength = frame.metadata != null ? frame.metadata.byteLength : 0;
		    return FRAME_HEADER_SIZE + LEASE_FIXED_SIZE + metaLength;
		}
		/**
		 * Reads a LEASE frame from the buffer and returns it.
		 */
		function deserializeLeaseFrame(buffer, streamId, flags) {
		    // invariant(
		    //   streamId === 0,
		    //   "RSocketBinaryFraming: Invalid LEASE frame, expected stream id to be 0."
		    // );
		    // const length = buffer.length;
		    var offset = FRAME_HEADER_SIZE;
		    var ttl = buffer.readUInt32BE(offset);
		    offset += 4;
		    var requestCount = buffer.readUInt32BE(offset);
		    offset += 4;
		    var metadata = null;
		    if (offset < buffer.length) {
		        metadata = buffer.slice(offset, buffer.length);
		    }
		    return {
		        flags: flags,
		        metadata: metadata,
		        requestCount: requestCount,
		        // streamId,
		        streamId: 0,
		        ttl: ttl,
		        type: Frames_1.FrameTypes.LEASE,
		    };
		}
		/**
		 * Writes a REQUEST_FNF or REQUEST_RESPONSE frame to a new buffer and returns
		 * it.
		 *
		 * Note that these frames have the same shape and only differ in their type.
		 */
		function serializeRequestFrame(frame) {
		    var payloadLength = getPayloadLength(frame);
		    var buffer = bufferExports.Buffer.allocUnsafe(FRAME_HEADER_SIZE + payloadLength);
		    var offset = writeHeader(frame, buffer);
		    writePayload(frame, buffer, offset);
		    return buffer;
		}
		function sizeOfRequestFrame(frame) {
		    var payloadLength = getPayloadLength(frame);
		    return FRAME_HEADER_SIZE + payloadLength;
		}
		/**
		 * Writes a METADATA_PUSH frame to a new buffer and returns
		 * it.
		 */
		function serializeMetadataPushFrame(frame) {
		    var metadata = frame.metadata;
		    if (metadata != null) {
		        var buffer = bufferExports.Buffer.allocUnsafe(FRAME_HEADER_SIZE + metadata.byteLength);
		        var offset = writeHeader(frame, buffer);
		        metadata.copy(buffer, offset);
		        return buffer;
		    }
		    else {
		        var buffer = bufferExports.Buffer.allocUnsafe(FRAME_HEADER_SIZE);
		        writeHeader(frame, buffer);
		        return buffer;
		    }
		}
		function sizeOfMetadataPushFrame(frame) {
		    return (FRAME_HEADER_SIZE + (frame.metadata != null ? frame.metadata.byteLength : 0));
		}
		function deserializeRequestFnfFrame(buffer, streamId, flags) {
		    // invariant(
		    //   streamId > 0,
		    //   "RSocketBinaryFraming: Invalid REQUEST_FNF frame, expected stream id to be > 0."
		    // );
		    buffer.length;
		    var frame = {
		        data: null,
		        flags: flags,
		        // length,
		        metadata: null,
		        streamId: streamId,
		        type: Frames_1.FrameTypes.REQUEST_FNF,
		    };
		    readPayload(buffer, frame, FRAME_HEADER_SIZE);
		    return frame;
		}
		function deserializeRequestResponseFrame(buffer, streamId, flags) {
		    // invariant(
		    // streamId > 0,
		    // "RSocketBinaryFraming: Invalid REQUEST_RESPONSE frame, expected stream id to be > 0."
		    // );
		    // const length = buffer.length;
		    var frame = {
		        data: null,
		        flags: flags,
		        // length,
		        metadata: null,
		        streamId: streamId,
		        type: Frames_1.FrameTypes.REQUEST_RESPONSE,
		    };
		    readPayload(buffer, frame, FRAME_HEADER_SIZE);
		    return frame;
		}
		function deserializeMetadataPushFrame(buffer, streamId, flags) {
		    // invariant(
		    //   streamId === 0,
		    //   "RSocketBinaryFraming: Invalid METADATA_PUSH frame, expected stream id to be 0."
		    // );
		    // const length = buffer.length;
		    return {
		        flags: flags,
		        // length,
		        metadata: length === FRAME_HEADER_SIZE
		            ? null
		            : buffer.slice(FRAME_HEADER_SIZE, length),
		        // streamId,
		        streamId: 0,
		        type: Frames_1.FrameTypes.METADATA_PUSH,
		    };
		}
		/**
		 * Writes a REQUEST_STREAM or REQUEST_CHANNEL frame to a new buffer and returns
		 * it.
		 *
		 * Note that these frames have the same shape and only differ in their type.
		 *
		 * Prefix size is for requestN (uint32 = 4).
		 */
		var REQUEST_MANY_HEADER = 4;
		function serializeRequestManyFrame(frame) {
		    var payloadLength = getPayloadLength(frame);
		    var buffer = bufferExports.Buffer.allocUnsafe(FRAME_HEADER_SIZE + REQUEST_MANY_HEADER + payloadLength);
		    var offset = writeHeader(frame, buffer);
		    offset = buffer.writeUInt32BE(frame.requestN, offset);
		    writePayload(frame, buffer, offset);
		    return buffer;
		}
		function sizeOfRequestManyFrame(frame) {
		    var payloadLength = getPayloadLength(frame);
		    return FRAME_HEADER_SIZE + REQUEST_MANY_HEADER + payloadLength;
		}
		function deserializeRequestStreamFrame(buffer, streamId, flags) {
		    // invariant(
		    //   streamId > 0,
		    //   "RSocketBinaryFraming: Invalid REQUEST_STREAM frame, expected stream id to be > 0."
		    // );
		    buffer.length;
		    var offset = FRAME_HEADER_SIZE;
		    var requestN = buffer.readInt32BE(offset);
		    offset += 4;
		    // invariant(
		    //   requestN > 0,
		    //   "RSocketBinaryFraming: Invalid REQUEST_STREAM frame, expected requestN to be > 0, got `%s`.",
		    //   requestN
		    // );
		    var frame = {
		        data: null,
		        flags: flags,
		        // length,
		        metadata: null,
		        requestN: requestN,
		        streamId: streamId,
		        type: Frames_1.FrameTypes.REQUEST_STREAM,
		    };
		    readPayload(buffer, frame, offset);
		    return frame;
		}
		function deserializeRequestChannelFrame(buffer, streamId, flags) {
		    // invariant(
		    //   streamId > 0,
		    //   "RSocketBinaryFraming: Invalid REQUEST_CHANNEL frame, expected stream id to be > 0."
		    // );
		    buffer.length;
		    var offset = FRAME_HEADER_SIZE;
		    var requestN = buffer.readInt32BE(offset);
		    offset += 4;
		    // invariant(
		    //   requestN > 0,
		    //   "RSocketBinaryFraming: Invalid REQUEST_STREAM frame, expected requestN to be > 0, got `%s`.",
		    //   requestN
		    // );
		    var frame = {
		        data: null,
		        flags: flags,
		        // length,
		        metadata: null,
		        requestN: requestN,
		        streamId: streamId,
		        type: Frames_1.FrameTypes.REQUEST_CHANNEL,
		    };
		    readPayload(buffer, frame, offset);
		    return frame;
		}
		/**
		 * Writes a REQUEST_N frame to a new buffer and returns it.
		 *
		 * Prefix size is for requestN (uint32 = 4).
		 */
		var REQUEST_N_HEADER = 4;
		function serializeRequestNFrame(frame) {
		    var buffer = bufferExports.Buffer.allocUnsafe(FRAME_HEADER_SIZE + REQUEST_N_HEADER);
		    var offset = writeHeader(frame, buffer);
		    buffer.writeUInt32BE(frame.requestN, offset);
		    return buffer;
		}
		function sizeOfRequestNFrame(frame) {
		    return FRAME_HEADER_SIZE + REQUEST_N_HEADER;
		}
		function deserializeRequestNFrame(buffer, streamId, flags) {
		    // invariant(
		    //   streamId > 0,
		    //   "RSocketBinaryFraming: Invalid REQUEST_N frame, expected stream id to be > 0."
		    // );
		    buffer.length;
		    var requestN = buffer.readInt32BE(FRAME_HEADER_SIZE);
		    // invariant(
		    //   requestN > 0,
		    //   "RSocketBinaryFraming: Invalid REQUEST_STREAM frame, expected requestN to be > 0, got `%s`.",
		    //   requestN
		    // );
		    return {
		        flags: flags,
		        // length,
		        requestN: requestN,
		        streamId: streamId,
		        type: Frames_1.FrameTypes.REQUEST_N,
		    };
		}
		/**
		 * Writes a CANCEL frame to a new buffer and returns it.
		 */
		function serializeCancelFrame(frame) {
		    var buffer = bufferExports.Buffer.allocUnsafe(FRAME_HEADER_SIZE);
		    writeHeader(frame, buffer);
		    return buffer;
		}
		function sizeOfCancelFrame(frame) {
		    return FRAME_HEADER_SIZE;
		}
		function deserializeCancelFrame(buffer, streamId, flags) {
		    // invariant(
		    //   streamId > 0,
		    //   "RSocketBinaryFraming: Invalid CANCEL frame, expected stream id to be > 0."
		    // );
		    buffer.length;
		    return {
		        flags: flags,
		        // length,
		        streamId: streamId,
		        type: Frames_1.FrameTypes.CANCEL,
		    };
		}
		/**
		 * Writes a PAYLOAD frame to a new buffer and returns it.
		 */
		function serializePayloadFrame(frame) {
		    var payloadLength = getPayloadLength(frame);
		    var buffer = bufferExports.Buffer.allocUnsafe(FRAME_HEADER_SIZE + payloadLength);
		    var offset = writeHeader(frame, buffer);
		    writePayload(frame, buffer, offset);
		    return buffer;
		}
		function sizeOfPayloadFrame(frame) {
		    var payloadLength = getPayloadLength(frame);
		    return FRAME_HEADER_SIZE + payloadLength;
		}
		function deserializePayloadFrame(buffer, streamId, flags) {
		    // invariant(
		    //   streamId > 0,
		    //   "RSocketBinaryFraming: Invalid PAYLOAD frame, expected stream id to be > 0."
		    // );
		    buffer.length;
		    var frame = {
		        data: null,
		        flags: flags,
		        // length,
		        metadata: null,
		        streamId: streamId,
		        type: Frames_1.FrameTypes.PAYLOAD,
		    };
		    readPayload(buffer, frame, FRAME_HEADER_SIZE);
		    return frame;
		}
		/**
		 * Writes a RESUME frame into a new buffer and returns it.
		 *
		 * Fixed size is:
		 * - major version (uint16 = 2)
		 * - minor version (uint16 = 2)
		 * - token length (uint16 = 2)
		 * - client position (uint64 = 8)
		 * - server position (uint64 = 8)
		 */
		var RESUME_FIXED_SIZE = 22;
		function serializeResumeFrame(frame) {
		    var resumeTokenLength = frame.resumeToken.byteLength;
		    var buffer = bufferExports.Buffer.allocUnsafe(FRAME_HEADER_SIZE + RESUME_FIXED_SIZE + resumeTokenLength);
		    var offset = writeHeader(frame, buffer);
		    offset = buffer.writeUInt16BE(frame.majorVersion, offset);
		    offset = buffer.writeUInt16BE(frame.minorVersion, offset);
		    offset = buffer.writeUInt16BE(resumeTokenLength, offset);
		    offset += frame.resumeToken.copy(buffer, offset);
		    offset = writeUInt64BE(buffer, frame.serverPosition, offset);
		    writeUInt64BE(buffer, frame.clientPosition, offset);
		    return buffer;
		}
		function sizeOfResumeFrame(frame) {
		    var resumeTokenLength = frame.resumeToken.byteLength;
		    return FRAME_HEADER_SIZE + RESUME_FIXED_SIZE + resumeTokenLength;
		}
		function deserializeResumeFrame(buffer, streamId, flags) {
		    // invariant(
		    //   streamId === 0,
		    //   "RSocketBinaryFraming: Invalid RESUME frame, expected stream id to be 0."
		    // );
		    buffer.length;
		    var offset = FRAME_HEADER_SIZE;
		    var majorVersion = buffer.readUInt16BE(offset);
		    offset += 2;
		    var minorVersion = buffer.readUInt16BE(offset);
		    offset += 2;
		    var resumeTokenLength = buffer.readInt16BE(offset);
		    offset += 2;
		    // invariant(
		    //   resumeTokenLength >= 0 && resumeTokenLength <= MAX_RESUME_LENGTH,
		    //   "RSocketBinaryFraming: Invalid SETUP frame, expected resumeToken length " +
		    //     "to be >= 0 and <= %s. Got `%s`.",
		    //   MAX_RESUME_LENGTH,
		    //   resumeTokenLength
		    // );
		    var resumeToken = buffer.slice(offset, offset + resumeTokenLength);
		    offset += resumeTokenLength;
		    var serverPosition = readUInt64BE(buffer, offset);
		    offset += 8;
		    var clientPosition = readUInt64BE(buffer, offset);
		    offset += 8;
		    return {
		        clientPosition: clientPosition,
		        flags: flags,
		        // length,
		        majorVersion: majorVersion,
		        minorVersion: minorVersion,
		        resumeToken: resumeToken,
		        serverPosition: serverPosition,
		        // streamId,
		        streamId: 0,
		        type: Frames_1.FrameTypes.RESUME,
		    };
		}
		/**
		 * Writes a RESUME_OK frame into a new buffer and returns it.
		 *
		 * Fixed size is:
		 * - client position (uint64 = 8)
		 */
		var RESUME_OK_FIXED_SIZE = 8;
		function serializeResumeOkFrame(frame) {
		    var buffer = bufferExports.Buffer.allocUnsafe(FRAME_HEADER_SIZE + RESUME_OK_FIXED_SIZE);
		    var offset = writeHeader(frame, buffer);
		    writeUInt64BE(buffer, frame.clientPosition, offset);
		    return buffer;
		}
		function sizeOfResumeOkFrame(frame) {
		    return FRAME_HEADER_SIZE + RESUME_OK_FIXED_SIZE;
		}
		function deserializeResumeOkFrame(buffer, streamId, flags) {
		    // invariant(
		    //   streamId === 0,
		    //   "RSocketBinaryFraming: Invalid RESUME frame, expected stream id to be 0."
		    // );
		    buffer.length;
		    var clientPosition = readUInt64BE(buffer, FRAME_HEADER_SIZE);
		    return {
		        clientPosition: clientPosition,
		        flags: flags,
		        // length,
		        // streamId,
		        streamId: 0,
		        type: Frames_1.FrameTypes.RESUME_OK,
		    };
		}
		/**
		 * Write the header of the frame into the buffer.
		 */
		function writeHeader(frame, buffer) {
		    var offset = buffer.writeInt32BE(frame.streamId, 0);
		    // shift frame to high 6 bits, extract lowest 10 bits from flags
		    return buffer.writeUInt16BE((frame.type << exports$1.FRAME_TYPE_OFFFSET) | (frame.flags & exports$1.FLAGS_MASK), offset);
		}
		/**
		 * Determine the length of the payload section of a frame. Only applies to
		 * frame types that MAY have both metadata and data.
		 */
		function getPayloadLength(frame) {
		    var payloadLength = 0;
		    if (frame.data != null) {
		        payloadLength += frame.data.byteLength;
		    }
		    if (Frames_1.Flags.hasMetadata(frame.flags)) {
		        payloadLength += UINT24_SIZE;
		        if (frame.metadata != null) {
		            payloadLength += frame.metadata.byteLength;
		        }
		    }
		    return payloadLength;
		}
		/**
		 * Write the payload of a frame into the given buffer. Only applies to frame
		 * types that MAY have both metadata and data.
		 */
		function writePayload(frame, buffer, offset) {
		    if (Frames_1.Flags.hasMetadata(frame.flags)) {
		        if (frame.metadata != null) {
		            var metaLength = frame.metadata.byteLength;
		            offset = writeUInt24BE(buffer, metaLength, offset);
		            offset += frame.metadata.copy(buffer, offset);
		        }
		        else {
		            offset = writeUInt24BE(buffer, 0, offset);
		        }
		    }
		    if (frame.data != null) {
		        frame.data.copy(buffer, offset);
		    }
		}
		/**
		 * Read the payload from a buffer and write it into the frame. Only applies to
		 * frame types that MAY have both metadata and data.
		 */
		function readPayload(buffer, frame, offset) {
		    if (Frames_1.Flags.hasMetadata(frame.flags)) {
		        var metaLength = readUInt24BE(buffer, offset);
		        offset += UINT24_SIZE;
		        if (metaLength > 0) {
		            frame.metadata = buffer.slice(offset, offset + metaLength);
		            offset += metaLength;
		        }
		    }
		    if (offset < buffer.length) {
		        frame.data = buffer.slice(offset, buffer.length);
		    }
		}
		// exported as class to facilitate testing
		var Deserializer = /** @class */ (function () {
		    function Deserializer() {
		    }
		    /**
		     * Read a frame from the buffer.
		     */
		    Deserializer.prototype.deserializeFrame = function (buffer) {
		        return deserializeFrame(buffer);
		    };
		    /**
		     * Reads a frame from a buffer that is prefixed with the frame length.
		     */
		    Deserializer.prototype.deserializeFrameWithLength = function (buffer) {
		        return deserializeFrameWithLength(buffer);
		    };
		    /**
		     * Given a buffer that may contain zero or more length-prefixed frames followed
		     * by zero or more bytes of a (partial) subsequent frame, returns an array of
		     * the frames and a int representing the buffer offset.
		     */
		    Deserializer.prototype.deserializeFrames = function (buffer) {
		        return deserializeFrames(buffer);
		    };
		    return Deserializer;
		}());
		exports$1.Deserializer = Deserializer;
		
	} (Codecs));
	return Codecs;
}

var Common = {};

var hasRequiredCommon;

function requireCommon () {
	if (hasRequiredCommon) return Common;
	hasRequiredCommon = 1;
	/*
	 * Copyright 2021-2022 the original author or authors.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */
	Object.defineProperty(Common, "__esModule", { value: true });
	
	return Common;
}

var Deferred = {};

var hasRequiredDeferred;

function requireDeferred () {
	if (hasRequiredDeferred) return Deferred;
	hasRequiredDeferred = 1;
	/*
	 * Copyright 2021-2022 the original author or authors.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */
	var __values = (Deferred && Deferred.__values) || function(o) {
	    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
	    if (m) return m.call(o);
	    if (o && typeof o.length === "number") return {
	        next: function () {
	            if (o && i >= o.length) o = void 0;
	            return { value: o && o[i++], done: !o };
	        }
	    };
	    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
	};
	Object.defineProperty(Deferred, "__esModule", { value: true });
	Deferred.Deferred = void 0;
	var Deferred$1 = /** @class */ (function () {
	    function Deferred() {
	        this._done = false;
	        this.onCloseCallbacks = [];
	    }
	    Object.defineProperty(Deferred.prototype, "done", {
	        get: function () {
	            return this._done;
	        },
	        enumerable: false,
	        configurable: true
	    });
	    /**
	     * Signals to an observer that the Deferred operation has been closed, which invokes
	     * the provided `onClose` callback.
	     */
	    Deferred.prototype.close = function (error) {
	        var e_1, _a, e_2, _b;
	        if (this.done) {
	            console.warn("Trying to close for the second time. ".concat(error ? "Dropping error [".concat(error, "].") : ""));
	            return;
	        }
	        this._done = true;
	        this._error = error;
	        if (error) {
	            try {
	                for (var _c = __values(this.onCloseCallbacks), _d = _c.next(); !_d.done; _d = _c.next()) {
	                    var callback = _d.value;
	                    callback(error);
	                }
	            }
	            catch (e_1_1) { e_1 = { error: e_1_1 }; }
	            finally {
	                try {
	                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
	                }
	                finally { if (e_1) throw e_1.error; }
	            }
	            return;
	        }
	        try {
	            for (var _e = __values(this.onCloseCallbacks), _f = _e.next(); !_f.done; _f = _e.next()) {
	                var callback = _f.value;
	                callback();
	            }
	        }
	        catch (e_2_1) { e_2 = { error: e_2_1 }; }
	        finally {
	            try {
	                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
	            }
	            finally { if (e_2) throw e_2.error; }
	        }
	    };
	    /**
	     * Registers a callback to be called when the Closeable is closed. optionally with an Error.
	     */
	    Deferred.prototype.onClose = function (callback) {
	        if (this._done) {
	            callback(this._error);
	            return;
	        }
	        this.onCloseCallbacks.push(callback);
	    };
	    return Deferred;
	}());
	Deferred.Deferred = Deferred$1;
	
	return Deferred;
}

var Errors = {};

var hasRequiredErrors;

function requireErrors () {
	if (hasRequiredErrors) return Errors;
	hasRequiredErrors = 1;
	(function (exports$1) {
		/*
		 * Copyright 2021-2022 the original author or authors.
		 *
		 * Licensed under the Apache License, Version 2.0 (the "License");
		 * you may not use this file except in compliance with the License.
		 * You may obtain a copy of the License at
		 *
		 *     http://www.apache.org/licenses/LICENSE-2.0
		 *
		 * Unless required by applicable law or agreed to in writing, software
		 * distributed under the License is distributed on an "AS IS" BASIS,
		 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
		 * See the License for the specific language governing permissions and
		 * limitations under the License.
		 */
		var __extends = (Errors && Errors.__extends) || (function () {
		    var extendStatics = function (d, b) {
		        extendStatics = Object.setPrototypeOf ||
		            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
		            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
		        return extendStatics(d, b);
		    };
		    return function (d, b) {
		        if (typeof b !== "function" && b !== null)
		            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
		        extendStatics(d, b);
		        function __() { this.constructor = d; }
		        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
		    };
		})();
		Object.defineProperty(exports$1, "__esModule", { value: true });
		exports$1.ErrorCodes = exports$1.RSocketError = void 0;
		var RSocketError = /** @class */ (function (_super) {
		    __extends(RSocketError, _super);
		    function RSocketError(code, message) {
		        var _this = _super.call(this, message) || this;
		        _this.code = code;
		        return _this;
		    }
		    return RSocketError;
		}(Error));
		exports$1.RSocketError = RSocketError;
		(function (ErrorCodes) {
		    ErrorCodes[ErrorCodes["RESERVED"] = 0] = "RESERVED";
		    ErrorCodes[ErrorCodes["INVALID_SETUP"] = 1] = "INVALID_SETUP";
		    ErrorCodes[ErrorCodes["UNSUPPORTED_SETUP"] = 2] = "UNSUPPORTED_SETUP";
		    ErrorCodes[ErrorCodes["REJECTED_SETUP"] = 3] = "REJECTED_SETUP";
		    ErrorCodes[ErrorCodes["REJECTED_RESUME"] = 4] = "REJECTED_RESUME";
		    ErrorCodes[ErrorCodes["CONNECTION_CLOSE"] = 258] = "CONNECTION_CLOSE";
		    ErrorCodes[ErrorCodes["CONNECTION_ERROR"] = 257] = "CONNECTION_ERROR";
		    ErrorCodes[ErrorCodes["APPLICATION_ERROR"] = 513] = "APPLICATION_ERROR";
		    ErrorCodes[ErrorCodes["REJECTED"] = 514] = "REJECTED";
		    ErrorCodes[ErrorCodes["CANCELED"] = 515] = "CANCELED";
		    ErrorCodes[ErrorCodes["INVALID"] = 516] = "INVALID";
		    ErrorCodes[ErrorCodes["RESERVED_EXTENSION"] = 4294967295] = "RESERVED_EXTENSION";
		})(exports$1.ErrorCodes || (exports$1.ErrorCodes = {}));
		
	} (Errors));
	return Errors;
}

var RSocket = {};

var hasRequiredRSocket;

function requireRSocket () {
	if (hasRequiredRSocket) return RSocket;
	hasRequiredRSocket = 1;
	/*
	 * Copyright 2021-2022 the original author or authors.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */
	Object.defineProperty(RSocket, "__esModule", { value: true });
	
	return RSocket;
}

var RSocketConnector = {};

var ClientServerMultiplexerDemultiplexer = {};

var hasRequiredClientServerMultiplexerDemultiplexer;

function requireClientServerMultiplexerDemultiplexer () {
	if (hasRequiredClientServerMultiplexerDemultiplexer) return ClientServerMultiplexerDemultiplexer;
	hasRequiredClientServerMultiplexerDemultiplexer = 1;
	(function (exports$1) {
		/*
		 * Copyright 2021-2022 the original author or authors.
		 *
		 * Licensed under the Apache License, Version 2.0 (the "License");
		 * you may not use this file except in compliance with the License.
		 * You may obtain a copy of the License at
		 *
		 *     http://www.apache.org/licenses/LICENSE-2.0
		 *
		 * Unless required by applicable law or agreed to in writing, software
		 * distributed under the License is distributed on an "AS IS" BASIS,
		 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
		 * See the License for the specific language governing permissions and
		 * limitations under the License.
		 */
		var __extends = (ClientServerMultiplexerDemultiplexer && ClientServerMultiplexerDemultiplexer.__extends) || (function () {
		    var extendStatics = function (d, b) {
		        extendStatics = Object.setPrototypeOf ||
		            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
		            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
		        return extendStatics(d, b);
		    };
		    return function (d, b) {
		        if (typeof b !== "function" && b !== null)
		            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
		        extendStatics(d, b);
		        function __() { this.constructor = d; }
		        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
		    };
		})();
		var __awaiter = (ClientServerMultiplexerDemultiplexer && ClientServerMultiplexerDemultiplexer.__awaiter) || function (thisArg, _arguments, P, generator) {
		    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
		    return new (P || (P = Promise))(function (resolve, reject) {
		        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
		        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
		        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
		        step((generator = generator.apply(thisArg, _arguments || [])).next());
		    });
		};
		var __generator = (ClientServerMultiplexerDemultiplexer && ClientServerMultiplexerDemultiplexer.__generator) || function (thisArg, body) {
		    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
		    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
		    function verb(n) { return function (v) { return step([n, v]); }; }
		    function step(op) {
		        if (f) throw new TypeError("Generator is already executing.");
		        while (_) try {
		            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
		            if (y = 0, t) op = [op[0] & 2, t.value];
		            switch (op[0]) {
		                case 0: case 1: t = op; break;
		                case 4: _.label++; return { value: op[1], done: false };
		                case 5: _.label++; y = op[1]; op = [0]; continue;
		                case 7: op = _.ops.pop(); _.trys.pop(); continue;
		                default:
		                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
		                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
		                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
		                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
		                    if (t[2]) _.ops.pop();
		                    _.trys.pop(); continue;
		            }
		            op = body.call(thisArg, _);
		        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
		        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
		    }
		};
		Object.defineProperty(exports$1, "__esModule", { value: true });
		exports$1.ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer = exports$1.ResumableClientServerInputMultiplexerDemultiplexer = exports$1.ClientServerInputMultiplexerDemultiplexer = exports$1.StreamIdGenerator = void 0;
		var _1 = requireDist();
		var Deferred_1 = requireDeferred();
		var Errors_1 = requireErrors();
		var Frames_1 = requireFrames();
		(function (StreamIdGenerator) {
		    function create(seedId) {
		        return new StreamIdGeneratorImpl(seedId);
		    }
		    StreamIdGenerator.create = create;
		    var StreamIdGeneratorImpl = /** @class */ (function () {
		        function StreamIdGeneratorImpl(currentId) {
		            this.currentId = currentId;
		        }
		        StreamIdGeneratorImpl.prototype.next = function (handler) {
		            var nextId = this.currentId + 2;
		            if (!handler(nextId)) {
		                return;
		            }
		            this.currentId = nextId;
		        };
		        return StreamIdGeneratorImpl;
		    }());
		})(exports$1.StreamIdGenerator || (exports$1.StreamIdGenerator = {}));
		var ClientServerInputMultiplexerDemultiplexer = /** @class */ (function (_super) {
		    __extends(ClientServerInputMultiplexerDemultiplexer, _super);
		    function ClientServerInputMultiplexerDemultiplexer(streamIdSupplier, outbound, closeable) {
		        var _this = _super.call(this) || this;
		        _this.streamIdSupplier = streamIdSupplier;
		        _this.outbound = outbound;
		        _this.closeable = closeable;
		        _this.registry = {};
		        closeable.onClose(_this.close.bind(_this));
		        return _this;
		    }
		    ClientServerInputMultiplexerDemultiplexer.prototype.handle = function (frame) {
		        if (Frames_1.Frame.isConnection(frame)) {
		            if (frame.type === _1.FrameTypes.RESERVED) {
		                // TODO: throw
		                return;
		            }
		            this.connectionFramesHandler.handle(frame);
		            // TODO: Connection Handler
		        }
		        else if (Frames_1.Frame.isRequest(frame)) {
		            if (this.registry[frame.streamId]) {
		                // TODO: Send error and close connection
		                return;
		            }
		            this.requestFramesHandler.handle(frame, this);
		        }
		        else {
		            var handler = this.registry[frame.streamId];
		            if (!handler) {
		                // TODO: add validation
		                return;
		            }
		            handler.handle(frame);
		        }
		        // TODO: add extensions support
		    };
		    ClientServerInputMultiplexerDemultiplexer.prototype.connectionInbound = function (handler) {
		        if (this.connectionFramesHandler) {
		            throw new Error("Connection frame handler has already been installed");
		        }
		        this.connectionFramesHandler = handler;
		    };
		    ClientServerInputMultiplexerDemultiplexer.prototype.handleRequestStream = function (handler) {
		        if (this.requestFramesHandler) {
		            throw new Error("Stream handler has already been installed");
		        }
		        this.requestFramesHandler = handler;
		    };
		    ClientServerInputMultiplexerDemultiplexer.prototype.send = function (frame) {
		        this.outbound.send(frame);
		    };
		    Object.defineProperty(ClientServerInputMultiplexerDemultiplexer.prototype, "connectionOutbound", {
		        get: function () {
		            return this;
		        },
		        enumerable: false,
		        configurable: true
		    });
		    ClientServerInputMultiplexerDemultiplexer.prototype.createRequestStream = function (streamHandler) {
		        var _this = this;
		        // handle requester side stream registration
		        if (this.done) {
		            streamHandler.handleReject(new Error("Already closed"));
		            return;
		        }
		        var registry = this.registry;
		        this.streamIdSupplier.next(function (streamId) { return streamHandler.handleReady(streamId, _this); }, Object.keys(registry));
		    };
		    ClientServerInputMultiplexerDemultiplexer.prototype.connect = function (handler) {
		        this.registry[handler.streamId] = handler;
		    };
		    ClientServerInputMultiplexerDemultiplexer.prototype.disconnect = function (stream) {
		        delete this.registry[stream.streamId];
		    };
		    ClientServerInputMultiplexerDemultiplexer.prototype.close = function (error) {
		        if (this.done) {
		            _super.prototype.close.call(this, error);
		            return;
		        }
		        for (var streamId in this.registry) {
		            var stream = this.registry[streamId];
		            stream.close(new Error("Closed. ".concat(error ? "Original cause [".concat(error, "].") : "")));
		        }
		        _super.prototype.close.call(this, error);
		    };
		    return ClientServerInputMultiplexerDemultiplexer;
		}(Deferred_1.Deferred));
		exports$1.ClientServerInputMultiplexerDemultiplexer = ClientServerInputMultiplexerDemultiplexer;
		var ResumableClientServerInputMultiplexerDemultiplexer = /** @class */ (function (_super) {
		    __extends(ResumableClientServerInputMultiplexerDemultiplexer, _super);
		    function ResumableClientServerInputMultiplexerDemultiplexer(streamIdSupplier, outbound, closeable, frameStore, token, sessionStoreOrReconnector, sessionTimeout) {
		        var _this = _super.call(this, streamIdSupplier, outbound, new Deferred_1.Deferred()) || this;
		        _this.frameStore = frameStore;
		        _this.token = token;
		        _this.sessionTimeout = sessionTimeout;
		        if (sessionStoreOrReconnector instanceof Function) {
		            _this.reconnector = sessionStoreOrReconnector;
		        }
		        else {
		            _this.sessionStore = sessionStoreOrReconnector;
		        }
		        closeable.onClose(_this.handleConnectionClose.bind(_this));
		        return _this;
		    }
		    ResumableClientServerInputMultiplexerDemultiplexer.prototype.send = function (frame) {
		        if (Frames_1.Frame.isConnection(frame)) {
		            if (frame.type === _1.FrameTypes.KEEPALIVE) {
		                frame.lastReceivedPosition = this.frameStore.lastReceivedFramePosition;
		            }
		            else if (frame.type === _1.FrameTypes.ERROR) {
		                this.outbound.send(frame);
		                if (this.sessionStore) {
		                    delete this.sessionStore[this.token];
		                }
		                _super.prototype.close.call(this, new Errors_1.RSocketError(frame.code, frame.message));
		                return;
		            }
		        }
		        else {
		            this.frameStore.store(frame);
		        }
		        this.outbound.send(frame);
		    };
		    ResumableClientServerInputMultiplexerDemultiplexer.prototype.handle = function (frame) {
		        if (Frames_1.Frame.isConnection(frame)) {
		            if (frame.type === _1.FrameTypes.KEEPALIVE) {
		                try {
		                    this.frameStore.dropTo(frame.lastReceivedPosition);
		                }
		                catch (re) {
		                    this.outbound.send({
		                        type: _1.FrameTypes.ERROR,
		                        streamId: 0,
		                        flags: _1.Flags.NONE,
		                        code: re.code,
		                        message: re.message,
		                    });
		                    this.close(re);
		                }
		            }
		            else if (frame.type === _1.FrameTypes.ERROR) {
		                _super.prototype.handle.call(this, frame);
		                if (this.sessionStore) {
		                    delete this.sessionStore[this.token];
		                }
		                _super.prototype.close.call(this, new Errors_1.RSocketError(frame.code, frame.message));
		                return;
		            }
		        }
		        else {
		            this.frameStore.record(frame);
		        }
		        _super.prototype.handle.call(this, frame);
		    };
		    ResumableClientServerInputMultiplexerDemultiplexer.prototype.resume = function (frame, outbound, closeable) {
		        this.outbound = outbound;
		        switch (frame.type) {
		            case _1.FrameTypes.RESUME: {
		                clearTimeout(this.timeoutId);
		                if (this.frameStore.lastReceivedFramePosition < frame.clientPosition) {
		                    var e = new Errors_1.RSocketError(_1.ErrorCodes.REJECTED_RESUME, "Impossible to resume since first available client frame position is greater than last received server frame position");
		                    this.outbound.send({
		                        type: _1.FrameTypes.ERROR,
		                        streamId: 0,
		                        flags: _1.Flags.NONE,
		                        code: e.code,
		                        message: e.message,
		                    });
		                    this.close(e);
		                    return;
		                }
		                try {
		                    this.frameStore.dropTo(frame.serverPosition);
		                }
		                catch (re) {
		                    this.outbound.send({
		                        type: _1.FrameTypes.ERROR,
		                        streamId: 0,
		                        flags: _1.Flags.NONE,
		                        code: re.code,
		                        message: re.message,
		                    });
		                    this.close(re);
		                    return;
		                }
		                this.outbound.send({
		                    type: _1.FrameTypes.RESUME_OK,
		                    streamId: 0,
		                    flags: _1.Flags.NONE,
		                    clientPosition: this.frameStore.lastReceivedFramePosition,
		                });
		                break;
		            }
		            case _1.FrameTypes.RESUME_OK: {
		                try {
		                    this.frameStore.dropTo(frame.clientPosition);
		                }
		                catch (re) {
		                    this.outbound.send({
		                        type: _1.FrameTypes.ERROR,
		                        streamId: 0,
		                        flags: _1.Flags.NONE,
		                        code: re.code,
		                        message: re.message,
		                    });
		                    this.close(re);
		                }
		                break;
		            }
		        }
		        this.frameStore.drain(this.outbound.send.bind(this.outbound));
		        closeable.onClose(this.handleConnectionClose.bind(this));
		        this.connectionFramesHandler.resume();
		    };
		    ResumableClientServerInputMultiplexerDemultiplexer.prototype.handleConnectionClose = function (_error) {
		        return __awaiter(this, void 0, void 0, function () {
		            var e_1;
		            return __generator(this, function (_a) {
		                switch (_a.label) {
		                    case 0:
		                        this.connectionFramesHandler.pause();
		                        if (!this.reconnector) return [3 /*break*/, 5];
		                        _a.label = 1;
		                    case 1:
		                        _a.trys.push([1, 3, , 4]);
		                        return [4 /*yield*/, this.reconnector(this, this.frameStore)];
		                    case 2:
		                        _a.sent();
		                        return [3 /*break*/, 4];
		                    case 3:
		                        e_1 = _a.sent();
		                        this.close(e_1);
		                        return [3 /*break*/, 4];
		                    case 4: return [3 /*break*/, 6];
		                    case 5:
		                        this.timeoutId = setTimeout(this.close.bind(this), this.sessionTimeout);
		                        _a.label = 6;
		                    case 6: return [2 /*return*/];
		                }
		            });
		        });
		    };
		    return ResumableClientServerInputMultiplexerDemultiplexer;
		}(ClientServerInputMultiplexerDemultiplexer));
		exports$1.ResumableClientServerInputMultiplexerDemultiplexer = ResumableClientServerInputMultiplexerDemultiplexer;
		var ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer = /** @class */ (function () {
		    function ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer(outbound, closeable, delegate) {
		        this.outbound = outbound;
		        this.closeable = closeable;
		        this.delegate = delegate;
		        this.resumed = false;
		    }
		    ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer.prototype.close = function () {
		        this.delegate.close();
		    };
		    ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer.prototype.onClose = function (callback) {
		        this.delegate.onClose(callback);
		    };
		    Object.defineProperty(ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer.prototype, "connectionOutbound", {
		        get: function () {
		            return this.delegate.connectionOutbound;
		        },
		        enumerable: false,
		        configurable: true
		    });
		    ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer.prototype.createRequestStream = function (streamHandler) {
		        this.delegate.createRequestStream(streamHandler);
		    };
		    ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer.prototype.connectionInbound = function (handler) {
		        this.delegate.connectionInbound(handler);
		    };
		    ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer.prototype.handleRequestStream = function (handler) {
		        this.delegate.handleRequestStream(handler);
		    };
		    ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer.prototype.handle = function (frame) {
		        var _this = this;
		        if (!this.resumed) {
		            if (frame.type === _1.FrameTypes.RESUME_OK) {
		                this.resumed = true;
		                this.delegate.resume(frame, this.outbound, this.closeable);
		                return;
		            }
		            else {
		                this.outbound.send({
		                    type: _1.FrameTypes.ERROR,
		                    streamId: 0,
		                    code: _1.ErrorCodes.CONNECTION_ERROR,
		                    message: "Incomplete RESUME handshake. Unexpected frame ".concat(frame.type, " received"),
		                    flags: _1.Flags.NONE,
		                });
		                this.closeable.close();
		                this.closeable.onClose(function () {
		                    return _this.delegate.close(new Errors_1.RSocketError(_1.ErrorCodes.CONNECTION_ERROR, "Incomplete RESUME handshake. Unexpected frame ".concat(frame.type, " received")));
		                });
		            }
		            return;
		        }
		        this.delegate.handle(frame);
		    };
		    return ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer;
		}());
		exports$1.ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer = ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer;
		
	} (ClientServerMultiplexerDemultiplexer));
	return ClientServerMultiplexerDemultiplexer;
}

var RSocketSupport = {};

var RequestChannelStream = {};

var Fragmenter = {};

var hasRequiredFragmenter;

function requireFragmenter () {
	if (hasRequiredFragmenter) return Fragmenter;
	hasRequiredFragmenter = 1;
	/*
	 * Copyright 2021-2022 the original author or authors.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */
	var __generator = (Fragmenter && Fragmenter.__generator) || function (thisArg, body) {
	    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
	    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
	    function verb(n) { return function (v) { return step([n, v]); }; }
	    function step(op) {
	        if (f) throw new TypeError("Generator is already executing.");
	        while (_) try {
	            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
	            if (y = 0, t) op = [op[0] & 2, t.value];
	            switch (op[0]) {
	                case 0: case 1: t = op; break;
	                case 4: _.label++; return { value: op[1], done: false };
	                case 5: _.label++; y = op[1]; op = [0]; continue;
	                case 7: op = _.ops.pop(); _.trys.pop(); continue;
	                default:
	                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
	                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
	                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
	                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
	                    if (t[2]) _.ops.pop();
	                    _.trys.pop(); continue;
	            }
	            op = body.call(thisArg, _);
	        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
	        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
	    }
	};
	Object.defineProperty(Fragmenter, "__esModule", { value: true });
	Fragmenter.fragmentWithRequestN = Fragmenter.fragment = Fragmenter.isFragmentable = void 0;
	var Frames_1 = requireFrames();
	function isFragmentable(payload, fragmentSize, frameType) {
	    if (fragmentSize === 0) {
	        return false;
	    }
	    return (payload.data.byteLength +
	        (payload.metadata ? payload.metadata.byteLength + Frames_1.Lengths.METADATA : 0) +
	        (frameType == Frames_1.FrameTypes.REQUEST_STREAM ||
	            frameType == Frames_1.FrameTypes.REQUEST_CHANNEL
	            ? Frames_1.Lengths.REQUEST
	            : 0) >
	        fragmentSize);
	}
	Fragmenter.isFragmentable = isFragmentable;
	function fragment(streamId, payload, fragmentSize, frameType, isComplete) {
	    var dataLength, firstFrame, remaining, metadata, metadataLength, metadataPosition, nextMetadataPosition, nextMetadataPosition, dataPosition, data, nextDataPosition, nextDataPosition;
	    var _a, _b;
	    if (isComplete === void 0) { isComplete = false; }
	    return __generator(this, function (_c) {
	        switch (_c.label) {
	            case 0:
	                dataLength = (_b = (_a = payload.data) === null || _a === void 0 ? void 0 : _a.byteLength) !== null && _b !== void 0 ? _b : 0;
	                firstFrame = frameType !== Frames_1.FrameTypes.PAYLOAD;
	                remaining = fragmentSize;
	                if (!payload.metadata) return [3 /*break*/, 6];
	                metadataLength = payload.metadata.byteLength;
	                if (!(metadataLength === 0)) return [3 /*break*/, 1];
	                remaining -= Frames_1.Lengths.METADATA;
	                metadata = bufferExports.Buffer.allocUnsafe(0);
	                return [3 /*break*/, 6];
	            case 1:
	                metadataPosition = 0;
	                if (!firstFrame) return [3 /*break*/, 3];
	                remaining -= Frames_1.Lengths.METADATA;
	                nextMetadataPosition = Math.min(metadataLength, metadataPosition + remaining);
	                metadata = payload.metadata.slice(metadataPosition, nextMetadataPosition);
	                remaining -= metadata.byteLength;
	                metadataPosition = nextMetadataPosition;
	                if (!(remaining === 0)) return [3 /*break*/, 3];
	                firstFrame = false;
	                return [4 /*yield*/, {
	                        type: frameType,
	                        flags: Frames_1.Flags.FOLLOWS | Frames_1.Flags.METADATA,
	                        data: undefined,
	                        metadata: metadata,
	                        streamId: streamId,
	                    }];
	            case 2:
	                _c.sent();
	                metadata = undefined;
	                remaining = fragmentSize;
	                _c.label = 3;
	            case 3:
	                if (!(metadataPosition < metadataLength)) return [3 /*break*/, 6];
	                remaining -= Frames_1.Lengths.METADATA;
	                nextMetadataPosition = Math.min(metadataLength, metadataPosition + remaining);
	                metadata = payload.metadata.slice(metadataPosition, nextMetadataPosition);
	                remaining -= metadata.byteLength;
	                metadataPosition = nextMetadataPosition;
	                if (!(remaining === 0 || dataLength === 0)) return [3 /*break*/, 5];
	                return [4 /*yield*/, {
	                        type: Frames_1.FrameTypes.PAYLOAD,
	                        flags: Frames_1.Flags.NEXT |
	                            Frames_1.Flags.METADATA |
	                            (metadataPosition === metadataLength &&
	                                isComplete &&
	                                dataLength === 0
	                                ? Frames_1.Flags.COMPLETE
	                                : Frames_1.Flags.FOLLOWS),
	                        data: undefined,
	                        metadata: metadata,
	                        streamId: streamId,
	                    }];
	            case 4:
	                _c.sent();
	                metadata = undefined;
	                remaining = fragmentSize;
	                _c.label = 5;
	            case 5: return [3 /*break*/, 3];
	            case 6:
	                dataPosition = 0;
	                if (!firstFrame) return [3 /*break*/, 8];
	                nextDataPosition = Math.min(dataLength, dataPosition + remaining);
	                data = payload.data.slice(dataPosition, nextDataPosition);
	                remaining -= data.byteLength;
	                dataPosition = nextDataPosition;
	                return [4 /*yield*/, {
	                        type: frameType,
	                        flags: Frames_1.Flags.FOLLOWS | (metadata ? Frames_1.Flags.METADATA : Frames_1.Flags.NONE),
	                        data: data,
	                        metadata: metadata,
	                        streamId: streamId,
	                    }];
	            case 7:
	                _c.sent();
	                metadata = undefined;
	                data = undefined;
	                remaining = fragmentSize;
	                _c.label = 8;
	            case 8:
	                if (!(dataPosition < dataLength)) return [3 /*break*/, 10];
	                nextDataPosition = Math.min(dataLength, dataPosition + remaining);
	                data = payload.data.slice(dataPosition, nextDataPosition);
	                remaining -= data.byteLength;
	                dataPosition = nextDataPosition;
	                return [4 /*yield*/, {
	                        type: Frames_1.FrameTypes.PAYLOAD,
	                        flags: dataPosition === dataLength
	                            ? (isComplete ? Frames_1.Flags.COMPLETE : Frames_1.Flags.NONE) |
	                                Frames_1.Flags.NEXT |
	                                (metadata ? Frames_1.Flags.METADATA : 0)
	                            : Frames_1.Flags.FOLLOWS | Frames_1.Flags.NEXT | (metadata ? Frames_1.Flags.METADATA : 0),
	                        data: data,
	                        metadata: metadata,
	                        streamId: streamId,
	                    }];
	            case 9:
	                _c.sent();
	                metadata = undefined;
	                data = undefined;
	                remaining = fragmentSize;
	                return [3 /*break*/, 8];
	            case 10: return [2 /*return*/];
	        }
	    });
	}
	Fragmenter.fragment = fragment;
	function fragmentWithRequestN(streamId, payload, fragmentSize, frameType, requestN, isComplete) {
	    var dataLength, firstFrame, remaining, metadata, metadataLength, metadataPosition, nextMetadataPosition, nextMetadataPosition, dataPosition, data, nextDataPosition, nextDataPosition;
	    var _a, _b;
	    if (isComplete === void 0) { isComplete = false; }
	    return __generator(this, function (_c) {
	        switch (_c.label) {
	            case 0:
	                dataLength = (_b = (_a = payload.data) === null || _a === void 0 ? void 0 : _a.byteLength) !== null && _b !== void 0 ? _b : 0;
	                firstFrame = true;
	                remaining = fragmentSize;
	                if (!payload.metadata) return [3 /*break*/, 6];
	                metadataLength = payload.metadata.byteLength;
	                if (!(metadataLength === 0)) return [3 /*break*/, 1];
	                remaining -= Frames_1.Lengths.METADATA;
	                metadata = bufferExports.Buffer.allocUnsafe(0);
	                return [3 /*break*/, 6];
	            case 1:
	                metadataPosition = 0;
	                if (!firstFrame) return [3 /*break*/, 3];
	                remaining -= Frames_1.Lengths.METADATA + Frames_1.Lengths.REQUEST;
	                nextMetadataPosition = Math.min(metadataLength, metadataPosition + remaining);
	                metadata = payload.metadata.slice(metadataPosition, nextMetadataPosition);
	                remaining -= metadata.byteLength;
	                metadataPosition = nextMetadataPosition;
	                if (!(remaining === 0)) return [3 /*break*/, 3];
	                firstFrame = false;
	                return [4 /*yield*/, {
	                        type: frameType,
	                        flags: Frames_1.Flags.FOLLOWS | Frames_1.Flags.METADATA,
	                        data: undefined,
	                        requestN: requestN,
	                        metadata: metadata,
	                        streamId: streamId,
	                    }];
	            case 2:
	                _c.sent();
	                metadata = undefined;
	                remaining = fragmentSize;
	                _c.label = 3;
	            case 3:
	                if (!(metadataPosition < metadataLength)) return [3 /*break*/, 6];
	                remaining -= Frames_1.Lengths.METADATA;
	                nextMetadataPosition = Math.min(metadataLength, metadataPosition + remaining);
	                metadata = payload.metadata.slice(metadataPosition, nextMetadataPosition);
	                remaining -= metadata.byteLength;
	                metadataPosition = nextMetadataPosition;
	                if (!(remaining === 0 || dataLength === 0)) return [3 /*break*/, 5];
	                return [4 /*yield*/, {
	                        type: Frames_1.FrameTypes.PAYLOAD,
	                        flags: Frames_1.Flags.NEXT |
	                            Frames_1.Flags.METADATA |
	                            (metadataPosition === metadataLength &&
	                                isComplete &&
	                                dataLength === 0
	                                ? Frames_1.Flags.COMPLETE
	                                : Frames_1.Flags.FOLLOWS),
	                        data: undefined,
	                        metadata: metadata,
	                        streamId: streamId,
	                    }];
	            case 4:
	                _c.sent();
	                metadata = undefined;
	                remaining = fragmentSize;
	                _c.label = 5;
	            case 5: return [3 /*break*/, 3];
	            case 6:
	                dataPosition = 0;
	                if (!firstFrame) return [3 /*break*/, 8];
	                remaining -= Frames_1.Lengths.REQUEST;
	                nextDataPosition = Math.min(dataLength, dataPosition + remaining);
	                data = payload.data.slice(dataPosition, nextDataPosition);
	                remaining -= data.byteLength;
	                dataPosition = nextDataPosition;
	                return [4 /*yield*/, {
	                        type: frameType,
	                        flags: Frames_1.Flags.FOLLOWS | (metadata ? Frames_1.Flags.METADATA : Frames_1.Flags.NONE),
	                        data: data,
	                        requestN: requestN,
	                        metadata: metadata,
	                        streamId: streamId,
	                    }];
	            case 7:
	                _c.sent();
	                metadata = undefined;
	                data = undefined;
	                remaining = fragmentSize;
	                _c.label = 8;
	            case 8:
	                if (!(dataPosition < dataLength)) return [3 /*break*/, 10];
	                nextDataPosition = Math.min(dataLength, dataPosition + remaining);
	                data = payload.data.slice(dataPosition, nextDataPosition);
	                remaining -= data.byteLength;
	                dataPosition = nextDataPosition;
	                return [4 /*yield*/, {
	                        type: Frames_1.FrameTypes.PAYLOAD,
	                        flags: dataPosition === dataLength
	                            ? (isComplete ? Frames_1.Flags.COMPLETE : Frames_1.Flags.NONE) |
	                                Frames_1.Flags.NEXT |
	                                (metadata ? Frames_1.Flags.METADATA : 0)
	                            : Frames_1.Flags.FOLLOWS | Frames_1.Flags.NEXT | (metadata ? Frames_1.Flags.METADATA : 0),
	                        data: data,
	                        metadata: metadata,
	                        streamId: streamId,
	                    }];
	            case 9:
	                _c.sent();
	                metadata = undefined;
	                data = undefined;
	                remaining = fragmentSize;
	                return [3 /*break*/, 8];
	            case 10: return [2 /*return*/];
	        }
	    });
	}
	Fragmenter.fragmentWithRequestN = fragmentWithRequestN;
	
	return Fragmenter;
}

var Reassembler = {};

var hasRequiredReassembler;

function requireReassembler () {
	if (hasRequiredReassembler) return Reassembler;
	hasRequiredReassembler = 1;
	/*
	 * Copyright 2021-2022 the original author or authors.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */
	Object.defineProperty(Reassembler, "__esModule", { value: true });
	Reassembler.cancel = Reassembler.reassemble = Reassembler.add = void 0;
	function add(holder, dataFragment, metadataFragment) {
	    if (!holder.hasFragments) {
	        holder.hasFragments = true;
	        holder.data = dataFragment;
	        if (metadataFragment) {
	            holder.metadata = metadataFragment;
	        }
	        return true;
	    }
	    // TODO: add validation
	    holder.data = holder.data
	        ? bufferExports.Buffer.concat([holder.data, dataFragment])
	        : dataFragment;
	    if (holder.metadata && metadataFragment) {
	        holder.metadata = bufferExports.Buffer.concat([holder.metadata, metadataFragment]);
	    }
	    return true;
	}
	Reassembler.add = add;
	function reassemble(holder, dataFragment, metadataFragment) {
	    // TODO: add validation
	    holder.hasFragments = false;
	    var data = holder.data
	        ? bufferExports.Buffer.concat([holder.data, dataFragment])
	        : dataFragment;
	    holder.data = undefined;
	    if (holder.metadata) {
	        var metadata = metadataFragment
	            ? bufferExports.Buffer.concat([holder.metadata, metadataFragment])
	            : holder.metadata;
	        holder.metadata = undefined;
	        return {
	            data: data,
	            metadata: metadata,
	        };
	    }
	    return {
	        data: data,
	    };
	}
	Reassembler.reassemble = reassemble;
	function cancel(holder) {
	    holder.hasFragments = false;
	    holder.data = undefined;
	    holder.metadata = undefined;
	}
	Reassembler.cancel = cancel;
	
	return Reassembler;
}

var hasRequiredRequestChannelStream;

function requireRequestChannelStream () {
	if (hasRequiredRequestChannelStream) return RequestChannelStream;
	hasRequiredRequestChannelStream = 1;
	/*
	 * Copyright 2021-2022 the original author or authors.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */
	var __createBinding = (RequestChannelStream && RequestChannelStream.__createBinding) || (Object.create ? (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
	}) : (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    o[k2] = m[k];
	}));
	var __setModuleDefault = (RequestChannelStream && RequestChannelStream.__setModuleDefault) || (Object.create ? (function(o, v) {
	    Object.defineProperty(o, "default", { enumerable: true, value: v });
	}) : function(o, v) {
	    o["default"] = v;
	});
	var __importStar = (RequestChannelStream && RequestChannelStream.__importStar) || function (mod) {
	    if (mod && mod.__esModule) return mod;
	    var result = {};
	    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
	    __setModuleDefault(result, mod);
	    return result;
	};
	var __values = (RequestChannelStream && RequestChannelStream.__values) || function(o) {
	    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
	    if (m) return m.call(o);
	    if (o && typeof o.length === "number") return {
	        next: function () {
	            if (o && i >= o.length) o = void 0;
	            return { value: o && o[i++], done: !o };
	        }
	    };
	    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
	};
	Object.defineProperty(RequestChannelStream, "__esModule", { value: true });
	RequestChannelStream.RequestChannelResponderStream = RequestChannelStream.RequestChannelRequesterStream = void 0;
	var Errors_1 = requireErrors();
	var Fragmenter_1 = requireFragmenter();
	var Frames_1 = requireFrames();
	var Reassembler = __importStar(requireReassembler());
	var RequestChannelRequesterStream = /** @class */ (function () {
	    function RequestChannelRequesterStream(payload, isComplete, receiver, fragmentSize, initialRequestN, leaseManager) {
	        this.payload = payload;
	        this.isComplete = isComplete;
	        this.receiver = receiver;
	        this.fragmentSize = fragmentSize;
	        this.initialRequestN = initialRequestN;
	        this.leaseManager = leaseManager;
	        this.streamType = Frames_1.FrameTypes.REQUEST_CHANNEL;
	        // TODO: add payload size validation
	    }
	    RequestChannelRequesterStream.prototype.handleReady = function (streamId, stream) {
	        var e_1, _a;
	        if (this.outboundDone) {
	            return false;
	        }
	        this.streamId = streamId;
	        this.stream = stream;
	        stream.connect(this);
	        var isCompleted = this.isComplete;
	        if (isCompleted) {
	            this.outboundDone = isCompleted;
	        }
	        if ((0, Fragmenter_1.isFragmentable)(this.payload, this.fragmentSize, Frames_1.FrameTypes.REQUEST_CHANNEL)) {
	            try {
	                for (var _b = __values((0, Fragmenter_1.fragmentWithRequestN)(streamId, this.payload, this.fragmentSize, Frames_1.FrameTypes.REQUEST_CHANNEL, this.initialRequestN, isCompleted)), _c = _b.next(); !_c.done; _c = _b.next()) {
	                    var frame = _c.value;
	                    this.stream.send(frame);
	                }
	            }
	            catch (e_1_1) { e_1 = { error: e_1_1 }; }
	            finally {
	                try {
	                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
	                }
	                finally { if (e_1) throw e_1.error; }
	            }
	        }
	        else {
	            this.stream.send({
	                type: Frames_1.FrameTypes.REQUEST_CHANNEL,
	                data: this.payload.data,
	                metadata: this.payload.metadata,
	                requestN: this.initialRequestN,
	                flags: (this.payload.metadata !== undefined ? Frames_1.Flags.METADATA : Frames_1.Flags.NONE) |
	                    (isCompleted ? Frames_1.Flags.COMPLETE : Frames_1.Flags.NONE),
	                streamId: streamId,
	            });
	        }
	        if (this.hasExtension) {
	            this.stream.send({
	                type: Frames_1.FrameTypes.EXT,
	                streamId: streamId,
	                extendedContent: this.extendedContent,
	                extendedType: this.extendedType,
	                flags: this.flags,
	            });
	        }
	        return true;
	    };
	    RequestChannelRequesterStream.prototype.handleReject = function (error) {
	        if (this.inboundDone) {
	            return;
	        }
	        this.inboundDone = true;
	        this.outboundDone = true;
	        this.receiver.onError(error);
	    };
	    RequestChannelRequesterStream.prototype.handle = function (frame) {
	        var errorMessage;
	        var frameType = frame.type;
	        switch (frameType) {
	            case Frames_1.FrameTypes.PAYLOAD: {
	                var hasComplete = Frames_1.Flags.hasComplete(frame.flags);
	                var hasNext = Frames_1.Flags.hasNext(frame.flags);
	                if (hasComplete || !Frames_1.Flags.hasFollows(frame.flags)) {
	                    if (hasComplete) {
	                        this.inboundDone = true;
	                        if (this.outboundDone) {
	                            this.stream.disconnect(this);
	                        }
	                        if (!hasNext) {
	                            // TODO: add validation no frame in reassembly
	                            this.receiver.onComplete();
	                            return;
	                        }
	                    }
	                    var payload = this.hasFragments
	                        ? Reassembler.reassemble(this, frame.data, frame.metadata)
	                        : {
	                            data: frame.data,
	                            metadata: frame.metadata,
	                        };
	                    this.receiver.onNext(payload, hasComplete);
	                    return;
	                }
	                if (Reassembler.add(this, frame.data, frame.metadata)) {
	                    return;
	                }
	                errorMessage = "Unexpected frame size";
	                break;
	            }
	            case Frames_1.FrameTypes.CANCEL: {
	                if (this.outboundDone) {
	                    return;
	                }
	                this.outboundDone = true;
	                if (this.inboundDone) {
	                    this.stream.disconnect(this);
	                }
	                this.receiver.cancel();
	                return;
	            }
	            case Frames_1.FrameTypes.REQUEST_N: {
	                if (this.outboundDone) {
	                    return;
	                }
	                if (this.hasFragments) {
	                    errorMessage = "Unexpected frame type [".concat(frameType, "] during reassembly");
	                    break;
	                }
	                this.receiver.request(frame.requestN);
	                return;
	            }
	            case Frames_1.FrameTypes.ERROR: {
	                var outboundDone = this.outboundDone;
	                this.inboundDone = true;
	                this.outboundDone = true;
	                this.stream.disconnect(this);
	                Reassembler.cancel(this);
	                if (!outboundDone) {
	                    this.receiver.cancel();
	                }
	                this.receiver.onError(new Errors_1.RSocketError(frame.code, frame.message));
	                return;
	            }
	            case Frames_1.FrameTypes.EXT:
	                this.receiver.onExtension(frame.extendedType, frame.extendedContent, Frames_1.Flags.hasIgnore(frame.flags));
	                return;
	            default: {
	                errorMessage = "Unexpected frame type [".concat(frameType, "]");
	            }
	        }
	        this.close(new Errors_1.RSocketError(Errors_1.ErrorCodes.CANCELED, errorMessage));
	        this.stream.send({
	            type: Frames_1.FrameTypes.CANCEL,
	            streamId: this.streamId,
	            flags: Frames_1.Flags.NONE,
	        });
	        this.stream.disconnect(this);
	    };
	    RequestChannelRequesterStream.prototype.request = function (n) {
	        if (this.inboundDone) {
	            return;
	        }
	        if (!this.streamId) {
	            this.initialRequestN += n;
	            return;
	        }
	        this.stream.send({
	            type: Frames_1.FrameTypes.REQUEST_N,
	            flags: Frames_1.Flags.NONE,
	            requestN: n,
	            streamId: this.streamId,
	        });
	    };
	    RequestChannelRequesterStream.prototype.cancel = function () {
	        var _a;
	        var inboundDone = this.inboundDone;
	        var outboundDone = this.outboundDone;
	        if (inboundDone && outboundDone) {
	            return;
	        }
	        this.inboundDone = true;
	        this.outboundDone = true;
	        if (!outboundDone) {
	            this.receiver.cancel();
	        }
	        if (!this.streamId) {
	            (_a = this.leaseManager) === null || _a === void 0 ? void 0 : _a.cancelRequest(this);
	            return;
	        }
	        this.stream.send({
	            type: inboundDone ? Frames_1.FrameTypes.ERROR : Frames_1.FrameTypes.CANCEL,
	            flags: Frames_1.Flags.NONE,
	            streamId: this.streamId,
	            code: Errors_1.ErrorCodes.CANCELED,
	            message: "Cancelled",
	        });
	        this.stream.disconnect(this);
	        Reassembler.cancel(this);
	    };
	    RequestChannelRequesterStream.prototype.onNext = function (payload, isComplete) {
	        var e_2, _a;
	        if (this.outboundDone) {
	            return;
	        }
	        if (isComplete) {
	            this.outboundDone = true;
	            if (this.inboundDone) {
	                this.stream.disconnect(this);
	            }
	        }
	        if ((0, Fragmenter_1.isFragmentable)(payload, this.fragmentSize, Frames_1.FrameTypes.PAYLOAD)) {
	            try {
	                for (var _b = __values((0, Fragmenter_1.fragment)(this.streamId, payload, this.fragmentSize, Frames_1.FrameTypes.PAYLOAD, isComplete)), _c = _b.next(); !_c.done; _c = _b.next()) {
	                    var frame = _c.value;
	                    this.stream.send(frame);
	                }
	            }
	            catch (e_2_1) { e_2 = { error: e_2_1 }; }
	            finally {
	                try {
	                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
	                }
	                finally { if (e_2) throw e_2.error; }
	            }
	        }
	        else {
	            this.stream.send({
	                type: Frames_1.FrameTypes.PAYLOAD,
	                streamId: this.streamId,
	                flags: Frames_1.Flags.NEXT |
	                    (payload.metadata ? Frames_1.Flags.METADATA : Frames_1.Flags.NONE) |
	                    (isComplete ? Frames_1.Flags.COMPLETE : Frames_1.Flags.NONE),
	                data: payload.data,
	                metadata: payload.metadata,
	            });
	        }
	    };
	    RequestChannelRequesterStream.prototype.onComplete = function () {
	        if (!this.streamId) {
	            this.isComplete = true;
	            return;
	        }
	        if (this.outboundDone) {
	            return;
	        }
	        this.outboundDone = true;
	        this.stream.send({
	            type: Frames_1.FrameTypes.PAYLOAD,
	            streamId: this.streamId,
	            flags: Frames_1.Flags.COMPLETE,
	            data: null,
	            metadata: null,
	        });
	        if (this.inboundDone) {
	            this.stream.disconnect(this);
	        }
	    };
	    RequestChannelRequesterStream.prototype.onError = function (error) {
	        if (this.outboundDone) {
	            return;
	        }
	        var inboundDone = this.inboundDone;
	        this.outboundDone = true;
	        this.inboundDone = true;
	        this.stream.send({
	            type: Frames_1.FrameTypes.ERROR,
	            streamId: this.streamId,
	            flags: Frames_1.Flags.NONE,
	            code: error instanceof Errors_1.RSocketError
	                ? error.code
	                : Errors_1.ErrorCodes.APPLICATION_ERROR,
	            message: error.message,
	        });
	        this.stream.disconnect(this);
	        if (!inboundDone) {
	            this.receiver.onError(error);
	        }
	    };
	    RequestChannelRequesterStream.prototype.onExtension = function (extendedType, content, canBeIgnored) {
	        if (this.outboundDone) {
	            return;
	        }
	        if (!this.streamId) {
	            this.hasExtension = true;
	            this.extendedType = extendedType;
	            this.extendedContent = content;
	            this.flags = canBeIgnored ? Frames_1.Flags.IGNORE : Frames_1.Flags.NONE;
	            return;
	        }
	        this.stream.send({
	            streamId: this.streamId,
	            type: Frames_1.FrameTypes.EXT,
	            extendedType: extendedType,
	            extendedContent: content,
	            flags: canBeIgnored ? Frames_1.Flags.IGNORE : Frames_1.Flags.NONE,
	        });
	    };
	    RequestChannelRequesterStream.prototype.close = function (error) {
	        if (this.inboundDone && this.outboundDone) {
	            return;
	        }
	        var inboundDone = this.inboundDone;
	        var outboundDone = this.outboundDone;
	        this.inboundDone = true;
	        this.outboundDone = true;
	        Reassembler.cancel(this);
	        if (!outboundDone) {
	            this.receiver.cancel();
	        }
	        if (!inboundDone) {
	            if (error) {
	                this.receiver.onError(error);
	            }
	            else {
	                this.receiver.onComplete();
	            }
	        }
	    };
	    return RequestChannelRequesterStream;
	}());
	RequestChannelStream.RequestChannelRequesterStream = RequestChannelRequesterStream;
	var RequestChannelResponderStream = /** @class */ (function () {
	    function RequestChannelResponderStream(streamId, stream, fragmentSize, handler, frame) {
	        this.streamId = streamId;
	        this.stream = stream;
	        this.fragmentSize = fragmentSize;
	        this.handler = handler;
	        this.streamType = Frames_1.FrameTypes.REQUEST_CHANNEL;
	        stream.connect(this);
	        if (Frames_1.Flags.hasFollows(frame.flags)) {
	            Reassembler.add(this, frame.data, frame.metadata);
	            this.initialRequestN = frame.requestN;
	            this.isComplete = Frames_1.Flags.hasComplete(frame.flags);
	            return;
	        }
	        var payload = {
	            data: frame.data,
	            metadata: frame.metadata,
	        };
	        var hasComplete = Frames_1.Flags.hasComplete(frame.flags);
	        this.inboundDone = hasComplete;
	        try {
	            this.receiver = handler(payload, frame.requestN, hasComplete, this);
	            if (this.outboundDone && this.defferedError) {
	                this.receiver.onError(this.defferedError);
	            }
	        }
	        catch (error) {
	            if (this.outboundDone && !this.inboundDone) {
	                this.cancel();
	            }
	            else {
	                this.inboundDone = true;
	            }
	            this.onError(error);
	        }
	    }
	    RequestChannelResponderStream.prototype.handle = function (frame) {
	        var errorMessage;
	        var frameType = frame.type;
	        switch (frameType) {
	            case Frames_1.FrameTypes.PAYLOAD: {
	                if (Frames_1.Flags.hasFollows(frame.flags)) {
	                    if (Reassembler.add(this, frame.data, frame.metadata)) {
	                        return;
	                    }
	                    errorMessage = "Unexpected frame size";
	                    break;
	                }
	                var payload = this.hasFragments
	                    ? Reassembler.reassemble(this, frame.data, frame.metadata)
	                    : {
	                        data: frame.data,
	                        metadata: frame.metadata,
	                    };
	                var hasComplete = Frames_1.Flags.hasComplete(frame.flags);
	                if (!this.receiver) {
	                    var inboundDone = this.isComplete || hasComplete;
	                    if (inboundDone) {
	                        this.inboundDone = true;
	                        if (this.outboundDone) {
	                            this.stream.disconnect(this);
	                        }
	                    }
	                    try {
	                        this.receiver = this.handler(payload, this.initialRequestN, inboundDone, this);
	                        if (this.outboundDone && this.defferedError) {
	                        }
	                    }
	                    catch (error) {
	                        if (this.outboundDone && !this.inboundDone) {
	                            this.cancel();
	                        }
	                        else {
	                            this.inboundDone = true;
	                        }
	                        this.onError(error);
	                    }
	                }
	                else {
	                    if (hasComplete) {
	                        this.inboundDone = true;
	                        if (this.outboundDone) {
	                            this.stream.disconnect(this);
	                        }
	                        if (!Frames_1.Flags.hasNext(frame.flags)) {
	                            this.receiver.onComplete();
	                            return;
	                        }
	                    }
	                    this.receiver.onNext(payload, hasComplete);
	                }
	                return;
	            }
	            case Frames_1.FrameTypes.REQUEST_N: {
	                if (!this.receiver || this.hasFragments) {
	                    errorMessage = "Unexpected frame type [".concat(frameType, "] during reassembly");
	                    break;
	                }
	                this.receiver.request(frame.requestN);
	                return;
	            }
	            case Frames_1.FrameTypes.ERROR:
	            case Frames_1.FrameTypes.CANCEL: {
	                var inboundDone = this.inboundDone;
	                var outboundDone = this.outboundDone;
	                this.inboundDone = true;
	                this.outboundDone = true;
	                this.stream.disconnect(this);
	                Reassembler.cancel(this);
	                if (!this.receiver) {
	                    return;
	                }
	                if (!outboundDone) {
	                    this.receiver.cancel();
	                }
	                if (!inboundDone) {
	                    var error = frameType === Frames_1.FrameTypes.CANCEL
	                        ? new Errors_1.RSocketError(Errors_1.ErrorCodes.CANCELED, "Cancelled")
	                        : new Errors_1.RSocketError(frame.code, frame.message);
	                    this.receiver.onError(error);
	                }
	                return;
	            }
	            case Frames_1.FrameTypes.EXT: {
	                if (!this.receiver || this.hasFragments) {
	                    errorMessage = "Unexpected frame type [".concat(frameType, "] during reassembly");
	                    break;
	                }
	                this.receiver.onExtension(frame.extendedType, frame.extendedContent, Frames_1.Flags.hasIgnore(frame.flags));
	                return;
	            }
	            default: {
	                errorMessage = "Unexpected frame type [".concat(frameType, "]");
	                // TODO: throws if strict
	            }
	        }
	        this.stream.send({
	            type: Frames_1.FrameTypes.ERROR,
	            flags: Frames_1.Flags.NONE,
	            code: Errors_1.ErrorCodes.CANCELED,
	            message: errorMessage,
	            streamId: this.streamId,
	        });
	        this.stream.disconnect(this);
	        this.close(new Errors_1.RSocketError(Errors_1.ErrorCodes.CANCELED, errorMessage));
	    };
	    RequestChannelResponderStream.prototype.onError = function (error) {
	        if (this.outboundDone) {
	            console.warn("Trying to error for the second time. ".concat(error ? "Dropping error [".concat(error, "].") : ""));
	            return;
	        }
	        var inboundDone = this.inboundDone;
	        this.outboundDone = true;
	        this.inboundDone = true;
	        this.stream.send({
	            type: Frames_1.FrameTypes.ERROR,
	            flags: Frames_1.Flags.NONE,
	            code: error instanceof Errors_1.RSocketError
	                ? error.code
	                : Errors_1.ErrorCodes.APPLICATION_ERROR,
	            message: error.message,
	            streamId: this.streamId,
	        });
	        this.stream.disconnect(this);
	        if (!inboundDone) {
	            if (this.receiver) {
	                this.receiver.onError(error);
	            }
	            else {
	                this.defferedError = error;
	            }
	        }
	    };
	    RequestChannelResponderStream.prototype.onNext = function (payload, isCompletion) {
	        var e_3, _a;
	        if (this.outboundDone) {
	            return;
	        }
	        if (isCompletion) {
	            this.outboundDone = true;
	        }
	        // TODO: add payload size validation
	        if ((0, Fragmenter_1.isFragmentable)(payload, this.fragmentSize, Frames_1.FrameTypes.PAYLOAD)) {
	            try {
	                for (var _b = __values((0, Fragmenter_1.fragment)(this.streamId, payload, this.fragmentSize, Frames_1.FrameTypes.PAYLOAD, isCompletion)), _c = _b.next(); !_c.done; _c = _b.next()) {
	                    var frame = _c.value;
	                    this.stream.send(frame);
	                }
	            }
	            catch (e_3_1) { e_3 = { error: e_3_1 }; }
	            finally {
	                try {
	                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
	                }
	                finally { if (e_3) throw e_3.error; }
	            }
	        }
	        else {
	            this.stream.send({
	                type: Frames_1.FrameTypes.PAYLOAD,
	                flags: Frames_1.Flags.NEXT |
	                    (isCompletion ? Frames_1.Flags.COMPLETE : Frames_1.Flags.NONE) |
	                    (payload.metadata ? Frames_1.Flags.METADATA : Frames_1.Flags.NONE),
	                data: payload.data,
	                metadata: payload.metadata,
	                streamId: this.streamId,
	            });
	        }
	        if (isCompletion && this.inboundDone) {
	            this.stream.disconnect(this);
	        }
	    };
	    RequestChannelResponderStream.prototype.onComplete = function () {
	        if (this.outboundDone) {
	            return;
	        }
	        this.outboundDone = true;
	        this.stream.send({
	            type: Frames_1.FrameTypes.PAYLOAD,
	            flags: Frames_1.Flags.COMPLETE,
	            streamId: this.streamId,
	            data: null,
	            metadata: null,
	        });
	        if (this.inboundDone) {
	            this.stream.disconnect(this);
	        }
	    };
	    RequestChannelResponderStream.prototype.onExtension = function (extendedType, content, canBeIgnored) {
	        if (this.outboundDone && this.inboundDone) {
	            return;
	        }
	        this.stream.send({
	            type: Frames_1.FrameTypes.EXT,
	            streamId: this.streamId,
	            flags: canBeIgnored ? Frames_1.Flags.IGNORE : Frames_1.Flags.NONE,
	            extendedType: extendedType,
	            extendedContent: content,
	        });
	    };
	    RequestChannelResponderStream.prototype.request = function (n) {
	        if (this.inboundDone) {
	            return;
	        }
	        this.stream.send({
	            type: Frames_1.FrameTypes.REQUEST_N,
	            flags: Frames_1.Flags.NONE,
	            streamId: this.streamId,
	            requestN: n,
	        });
	    };
	    RequestChannelResponderStream.prototype.cancel = function () {
	        if (this.inboundDone) {
	            return;
	        }
	        this.inboundDone = true;
	        this.stream.send({
	            type: Frames_1.FrameTypes.CANCEL,
	            flags: Frames_1.Flags.NONE,
	            streamId: this.streamId,
	        });
	        if (this.outboundDone) {
	            this.stream.disconnect(this);
	        }
	    };
	    RequestChannelResponderStream.prototype.close = function (error) {
	        if (this.inboundDone && this.outboundDone) {
	            console.warn("Trying to close for the second time. ".concat(error ? "Dropping error [".concat(error, "].") : ""));
	            return;
	        }
	        var inboundDone = this.inboundDone;
	        var outboundDone = this.outboundDone;
	        this.inboundDone = true;
	        this.outboundDone = true;
	        Reassembler.cancel(this);
	        var receiver = this.receiver;
	        if (!receiver) {
	            return;
	        }
	        if (!outboundDone) {
	            receiver.cancel();
	        }
	        if (!inboundDone) {
	            if (error) {
	                receiver.onError(error);
	            }
	            else {
	                receiver.onComplete();
	            }
	        }
	    };
	    return RequestChannelResponderStream;
	}());
	RequestChannelStream.RequestChannelResponderStream = RequestChannelResponderStream;
	
	return RequestChannelStream;
}

var RequestFnFStream = {};

var hasRequiredRequestFnFStream;

function requireRequestFnFStream () {
	if (hasRequiredRequestFnFStream) return RequestFnFStream;
	hasRequiredRequestFnFStream = 1;
	/*
	 * Copyright 2021-2022 the original author or authors.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */
	var __createBinding = (RequestFnFStream && RequestFnFStream.__createBinding) || (Object.create ? (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
	}) : (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    o[k2] = m[k];
	}));
	var __setModuleDefault = (RequestFnFStream && RequestFnFStream.__setModuleDefault) || (Object.create ? (function(o, v) {
	    Object.defineProperty(o, "default", { enumerable: true, value: v });
	}) : function(o, v) {
	    o["default"] = v;
	});
	var __importStar = (RequestFnFStream && RequestFnFStream.__importStar) || function (mod) {
	    if (mod && mod.__esModule) return mod;
	    var result = {};
	    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
	    __setModuleDefault(result, mod);
	    return result;
	};
	var __values = (RequestFnFStream && RequestFnFStream.__values) || function(o) {
	    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
	    if (m) return m.call(o);
	    if (o && typeof o.length === "number") return {
	        next: function () {
	            if (o && i >= o.length) o = void 0;
	            return { value: o && o[i++], done: !o };
	        }
	    };
	    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
	};
	Object.defineProperty(RequestFnFStream, "__esModule", { value: true });
	RequestFnFStream.RequestFnfResponderStream = RequestFnFStream.RequestFnFRequesterStream = void 0;
	var Errors_1 = requireErrors();
	var Fragmenter_1 = requireFragmenter();
	var Frames_1 = requireFrames();
	var Reassembler = __importStar(requireReassembler());
	var RequestFnFRequesterStream = /** @class */ (function () {
	    function RequestFnFRequesterStream(payload, receiver, fragmentSize, leaseManager) {
	        this.payload = payload;
	        this.receiver = receiver;
	        this.fragmentSize = fragmentSize;
	        this.leaseManager = leaseManager;
	        this.streamType = Frames_1.FrameTypes.REQUEST_FNF;
	    }
	    RequestFnFRequesterStream.prototype.handleReady = function (streamId, stream) {
	        var e_1, _a;
	        if (this.done) {
	            return false;
	        }
	        this.streamId = streamId;
	        if ((0, Fragmenter_1.isFragmentable)(this.payload, this.fragmentSize, Frames_1.FrameTypes.REQUEST_FNF)) {
	            try {
	                for (var _b = __values((0, Fragmenter_1.fragment)(streamId, this.payload, this.fragmentSize, Frames_1.FrameTypes.REQUEST_FNF)), _c = _b.next(); !_c.done; _c = _b.next()) {
	                    var frame = _c.value;
	                    stream.send(frame);
	                }
	            }
	            catch (e_1_1) { e_1 = { error: e_1_1 }; }
	            finally {
	                try {
	                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
	                }
	                finally { if (e_1) throw e_1.error; }
	            }
	        }
	        else {
	            stream.send({
	                type: Frames_1.FrameTypes.REQUEST_FNF,
	                data: this.payload.data,
	                metadata: this.payload.metadata,
	                flags: this.payload.metadata ? Frames_1.Flags.METADATA : 0,
	                streamId: streamId,
	            });
	        }
	        this.done = true;
	        this.receiver.onComplete();
	        return true;
	    };
	    RequestFnFRequesterStream.prototype.handleReject = function (error) {
	        if (this.done) {
	            return;
	        }
	        this.done = true;
	        this.receiver.onError(error);
	    };
	    RequestFnFRequesterStream.prototype.cancel = function () {
	        var _a;
	        if (this.done) {
	            return;
	        }
	        this.done = true;
	        (_a = this.leaseManager) === null || _a === void 0 ? void 0 : _a.cancelRequest(this);
	    };
	    RequestFnFRequesterStream.prototype.handle = function (frame) {
	        if (frame.type == Frames_1.FrameTypes.ERROR) {
	            this.close(new Errors_1.RSocketError(frame.code, frame.message));
	            return;
	        }
	        this.close(new Errors_1.RSocketError(Errors_1.ErrorCodes.CANCELED, "Received invalid frame"));
	    };
	    RequestFnFRequesterStream.prototype.close = function (error) {
	        if (this.done) {
	            console.warn("Trying to close for the second time. ".concat(error ? "Dropping error [".concat(error, "].") : ""));
	            return;
	        }
	        if (error) {
	            this.receiver.onError(error);
	        }
	        else {
	            this.receiver.onComplete();
	        }
	    };
	    return RequestFnFRequesterStream;
	}());
	RequestFnFStream.RequestFnFRequesterStream = RequestFnFRequesterStream;
	var RequestFnfResponderStream = /** @class */ (function () {
	    function RequestFnfResponderStream(streamId, stream, handler, frame) {
	        this.streamId = streamId;
	        this.stream = stream;
	        this.handler = handler;
	        this.streamType = Frames_1.FrameTypes.REQUEST_FNF;
	        if (Frames_1.Flags.hasFollows(frame.flags)) {
	            Reassembler.add(this, frame.data, frame.metadata);
	            stream.connect(this);
	            return;
	        }
	        var payload = {
	            data: frame.data,
	            metadata: frame.metadata,
	        };
	        try {
	            this.cancellable = handler(payload, this);
	        }
	        catch (e) {
	            // do nothing
	        }
	    }
	    RequestFnfResponderStream.prototype.handle = function (frame) {
	        var errorMessage;
	        if (frame.type == Frames_1.FrameTypes.PAYLOAD) {
	            if (Frames_1.Flags.hasFollows(frame.flags)) {
	                if (Reassembler.add(this, frame.data, frame.metadata)) {
	                    return;
	                }
	                errorMessage = "Unexpected fragment size";
	            }
	            else {
	                this.stream.disconnect(this);
	                var payload = Reassembler.reassemble(this, frame.data, frame.metadata);
	                try {
	                    this.cancellable = this.handler(payload, this);
	                }
	                catch (e) {
	                    // do nothing
	                }
	                return;
	            }
	        }
	        else {
	            errorMessage = "Unexpected frame type [".concat(frame.type, "]");
	        }
	        this.done = true;
	        if (frame.type != Frames_1.FrameTypes.CANCEL && frame.type != Frames_1.FrameTypes.ERROR) {
	            this.stream.send({
	                type: Frames_1.FrameTypes.ERROR,
	                streamId: this.streamId,
	                flags: Frames_1.Flags.NONE,
	                code: Errors_1.ErrorCodes.CANCELED,
	                message: errorMessage,
	            });
	        }
	        this.stream.disconnect(this);
	        Reassembler.cancel(this);
	        // TODO: throws if strict
	    };
	    RequestFnfResponderStream.prototype.close = function (error) {
	        var _a;
	        if (this.done) {
	            console.warn("Trying to close for the second time. ".concat(error ? "Dropping error [".concat(error, "].") : ""));
	            return;
	        }
	        this.done = true;
	        Reassembler.cancel(this);
	        (_a = this.cancellable) === null || _a === void 0 ? void 0 : _a.cancel();
	    };
	    RequestFnfResponderStream.prototype.onError = function (error) { };
	    RequestFnfResponderStream.prototype.onComplete = function () { };
	    return RequestFnfResponderStream;
	}());
	RequestFnFStream.RequestFnfResponderStream = RequestFnfResponderStream;
	/*
	export function request(
	  payload: Payload,
	  responderStream: UnidirectionalStream
	): Handler<Cancellable> {
	  return {
	    create: (r) => {
	      const response = new RequestFnFRequesterHandler(
	        payload,
	        responderStream,
	        r
	      );

	      r.add(response);

	      return response;
	    },
	  };
	}

	export function response(
	  handler: (payload: Payload, responderStream: UnidirectionalStream,) => void
	): Handler<void> {
	  return {
	    create: (r) => new RequestFnfResponderHandler(),
	  };
	} */
	
	return RequestFnFStream;
}

var RequestResponseStream = {};

var hasRequiredRequestResponseStream;

function requireRequestResponseStream () {
	if (hasRequiredRequestResponseStream) return RequestResponseStream;
	hasRequiredRequestResponseStream = 1;
	/*
	 * Copyright 2021-2022 the original author or authors.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */
	var __createBinding = (RequestResponseStream && RequestResponseStream.__createBinding) || (Object.create ? (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
	}) : (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    o[k2] = m[k];
	}));
	var __setModuleDefault = (RequestResponseStream && RequestResponseStream.__setModuleDefault) || (Object.create ? (function(o, v) {
	    Object.defineProperty(o, "default", { enumerable: true, value: v });
	}) : function(o, v) {
	    o["default"] = v;
	});
	var __importStar = (RequestResponseStream && RequestResponseStream.__importStar) || function (mod) {
	    if (mod && mod.__esModule) return mod;
	    var result = {};
	    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
	    __setModuleDefault(result, mod);
	    return result;
	};
	var __values = (RequestResponseStream && RequestResponseStream.__values) || function(o) {
	    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
	    if (m) return m.call(o);
	    if (o && typeof o.length === "number") return {
	        next: function () {
	            if (o && i >= o.length) o = void 0;
	            return { value: o && o[i++], done: !o };
	        }
	    };
	    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
	};
	Object.defineProperty(RequestResponseStream, "__esModule", { value: true });
	RequestResponseStream.RequestResponseResponderStream = RequestResponseStream.RequestResponseRequesterStream = void 0;
	var Errors_1 = requireErrors();
	var Fragmenter_1 = requireFragmenter();
	var Frames_1 = requireFrames();
	var Reassembler = __importStar(requireReassembler());
	var RequestResponseRequesterStream = /** @class */ (function () {
	    function RequestResponseRequesterStream(payload, receiver, fragmentSize, leaseManager) {
	        this.payload = payload;
	        this.receiver = receiver;
	        this.fragmentSize = fragmentSize;
	        this.leaseManager = leaseManager;
	        this.streamType = Frames_1.FrameTypes.REQUEST_RESPONSE;
	    }
	    RequestResponseRequesterStream.prototype.handleReady = function (streamId, stream) {
	        var e_1, _a;
	        if (this.done) {
	            return false;
	        }
	        this.streamId = streamId;
	        this.stream = stream;
	        stream.connect(this);
	        if ((0, Fragmenter_1.isFragmentable)(this.payload, this.fragmentSize, Frames_1.FrameTypes.REQUEST_RESPONSE)) {
	            try {
	                for (var _b = __values((0, Fragmenter_1.fragment)(streamId, this.payload, this.fragmentSize, Frames_1.FrameTypes.REQUEST_RESPONSE)), _c = _b.next(); !_c.done; _c = _b.next()) {
	                    var frame = _c.value;
	                    this.stream.send(frame);
	                }
	            }
	            catch (e_1_1) { e_1 = { error: e_1_1 }; }
	            finally {
	                try {
	                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
	                }
	                finally { if (e_1) throw e_1.error; }
	            }
	        }
	        else {
	            this.stream.send({
	                type: Frames_1.FrameTypes.REQUEST_RESPONSE,
	                data: this.payload.data,
	                metadata: this.payload.metadata,
	                flags: this.payload.metadata ? Frames_1.Flags.METADATA : 0,
	                streamId: streamId,
	            });
	        }
	        if (this.hasExtension) {
	            this.stream.send({
	                type: Frames_1.FrameTypes.EXT,
	                streamId: streamId,
	                extendedContent: this.extendedContent,
	                extendedType: this.extendedType,
	                flags: this.flags,
	            });
	        }
	        return true;
	    };
	    RequestResponseRequesterStream.prototype.handleReject = function (error) {
	        if (this.done) {
	            return;
	        }
	        this.done = true;
	        this.receiver.onError(error);
	    };
	    RequestResponseRequesterStream.prototype.handle = function (frame) {
	        var errorMessage;
	        var frameType = frame.type;
	        switch (frameType) {
	            case Frames_1.FrameTypes.PAYLOAD: {
	                var hasComplete = Frames_1.Flags.hasComplete(frame.flags);
	                var hasPayload = Frames_1.Flags.hasNext(frame.flags);
	                if (hasComplete || !Frames_1.Flags.hasFollows(frame.flags)) {
	                    this.done = true;
	                    this.stream.disconnect(this);
	                    if (!hasPayload) {
	                        // TODO: add validation no frame in reassembly
	                        this.receiver.onComplete();
	                        return;
	                    }
	                    var payload = this.hasFragments
	                        ? Reassembler.reassemble(this, frame.data, frame.metadata)
	                        : {
	                            data: frame.data,
	                            metadata: frame.metadata,
	                        };
	                    this.receiver.onNext(payload, true);
	                    return;
	                }
	                if (!Reassembler.add(this, frame.data, frame.metadata)) {
	                    errorMessage = "Unexpected fragment size";
	                    break;
	                }
	                return;
	            }
	            case Frames_1.FrameTypes.ERROR: {
	                this.done = true;
	                this.stream.disconnect(this);
	                Reassembler.cancel(this);
	                this.receiver.onError(new Errors_1.RSocketError(frame.code, frame.message));
	                return;
	            }
	            case Frames_1.FrameTypes.EXT: {
	                if (this.hasFragments) {
	                    errorMessage = "Unexpected frame type [".concat(frameType, "] during reassembly");
	                    break;
	                }
	                this.receiver.onExtension(frame.extendedType, frame.extendedContent, Frames_1.Flags.hasIgnore(frame.flags));
	                return;
	            }
	            default: {
	                errorMessage = "Unexpected frame type [".concat(frameType, "]");
	            }
	        }
	        this.close(new Errors_1.RSocketError(Errors_1.ErrorCodes.CANCELED, errorMessage));
	        this.stream.send({
	            type: Frames_1.FrameTypes.CANCEL,
	            streamId: this.streamId,
	            flags: Frames_1.Flags.NONE,
	        });
	        this.stream.disconnect(this);
	        // TODO: throw an exception if strict frame handling mode
	    };
	    RequestResponseRequesterStream.prototype.cancel = function () {
	        var _a;
	        if (this.done) {
	            return;
	        }
	        this.done = true;
	        if (!this.streamId) {
	            (_a = this.leaseManager) === null || _a === void 0 ? void 0 : _a.cancelRequest(this);
	            return;
	        }
	        this.stream.send({
	            type: Frames_1.FrameTypes.CANCEL,
	            flags: Frames_1.Flags.NONE,
	            streamId: this.streamId,
	        });
	        this.stream.disconnect(this);
	        Reassembler.cancel(this);
	    };
	    RequestResponseRequesterStream.prototype.onExtension = function (extendedType, content, canBeIgnored) {
	        if (this.done) {
	            return;
	        }
	        if (!this.streamId) {
	            this.hasExtension = true;
	            this.extendedType = extendedType;
	            this.extendedContent = content;
	            this.flags = canBeIgnored ? Frames_1.Flags.IGNORE : Frames_1.Flags.NONE;
	            return;
	        }
	        this.stream.send({
	            streamId: this.streamId,
	            type: Frames_1.FrameTypes.EXT,
	            extendedType: extendedType,
	            extendedContent: content,
	            flags: canBeIgnored ? Frames_1.Flags.IGNORE : Frames_1.Flags.NONE,
	        });
	    };
	    RequestResponseRequesterStream.prototype.close = function (error) {
	        if (this.done) {
	            return;
	        }
	        this.done = true;
	        Reassembler.cancel(this);
	        if (error) {
	            this.receiver.onError(error);
	        }
	        else {
	            this.receiver.onComplete();
	        }
	    };
	    return RequestResponseRequesterStream;
	}());
	RequestResponseStream.RequestResponseRequesterStream = RequestResponseRequesterStream;
	var RequestResponseResponderStream = /** @class */ (function () {
	    function RequestResponseResponderStream(streamId, stream, fragmentSize, handler, frame) {
	        this.streamId = streamId;
	        this.stream = stream;
	        this.fragmentSize = fragmentSize;
	        this.handler = handler;
	        this.streamType = Frames_1.FrameTypes.REQUEST_RESPONSE;
	        stream.connect(this);
	        if (Frames_1.Flags.hasFollows(frame.flags)) {
	            Reassembler.add(this, frame.data, frame.metadata);
	            return;
	        }
	        var payload = {
	            data: frame.data,
	            metadata: frame.metadata,
	        };
	        try {
	            this.receiver = handler(payload, this);
	        }
	        catch (error) {
	            this.onError(error);
	        }
	    }
	    RequestResponseResponderStream.prototype.handle = function (frame) {
	        var _a;
	        var errorMessage;
	        if (!this.receiver || this.hasFragments) {
	            if (frame.type === Frames_1.FrameTypes.PAYLOAD) {
	                if (Frames_1.Flags.hasFollows(frame.flags)) {
	                    if (Reassembler.add(this, frame.data, frame.metadata)) {
	                        return;
	                    }
	                    errorMessage = "Unexpected fragment size";
	                }
	                else {
	                    var payload = Reassembler.reassemble(this, frame.data, frame.metadata);
	                    try {
	                        this.receiver = this.handler(payload, this);
	                    }
	                    catch (error) {
	                        this.onError(error);
	                    }
	                    return;
	                }
	            }
	            else {
	                errorMessage = "Unexpected frame type [".concat(frame.type, "] during reassembly");
	            }
	        }
	        else if (frame.type === Frames_1.FrameTypes.EXT) {
	            this.receiver.onExtension(frame.extendedType, frame.extendedContent, Frames_1.Flags.hasIgnore(frame.flags));
	            return;
	        }
	        else {
	            errorMessage = "Unexpected frame type [".concat(frame.type, "]");
	        }
	        this.done = true;
	        (_a = this.receiver) === null || _a === void 0 ? void 0 : _a.cancel();
	        if (frame.type !== Frames_1.FrameTypes.CANCEL && frame.type !== Frames_1.FrameTypes.ERROR) {
	            this.stream.send({
	                type: Frames_1.FrameTypes.ERROR,
	                flags: Frames_1.Flags.NONE,
	                code: Errors_1.ErrorCodes.CANCELED,
	                message: errorMessage,
	                streamId: this.streamId,
	            });
	        }
	        this.stream.disconnect(this);
	        Reassembler.cancel(this);
	        // TODO: throws if strict
	    };
	    RequestResponseResponderStream.prototype.onError = function (error) {
	        if (this.done) {
	            console.warn("Trying to error for the second time. ".concat(error ? "Dropping error [".concat(error, "].") : ""));
	            return;
	        }
	        this.done = true;
	        this.stream.send({
	            type: Frames_1.FrameTypes.ERROR,
	            flags: Frames_1.Flags.NONE,
	            code: error instanceof Errors_1.RSocketError
	                ? error.code
	                : Errors_1.ErrorCodes.APPLICATION_ERROR,
	            message: error.message,
	            streamId: this.streamId,
	        });
	        this.stream.disconnect(this);
	    };
	    RequestResponseResponderStream.prototype.onNext = function (payload, isCompletion) {
	        var e_2, _a;
	        if (this.done) {
	            return;
	        }
	        this.done = true;
	        // TODO: add payload size validation
	        if ((0, Fragmenter_1.isFragmentable)(payload, this.fragmentSize, Frames_1.FrameTypes.PAYLOAD)) {
	            try {
	                for (var _b = __values((0, Fragmenter_1.fragment)(this.streamId, payload, this.fragmentSize, Frames_1.FrameTypes.PAYLOAD, true)), _c = _b.next(); !_c.done; _c = _b.next()) {
	                    var frame = _c.value;
	                    this.stream.send(frame);
	                }
	            }
	            catch (e_2_1) { e_2 = { error: e_2_1 }; }
	            finally {
	                try {
	                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
	                }
	                finally { if (e_2) throw e_2.error; }
	            }
	        }
	        else {
	            this.stream.send({
	                type: Frames_1.FrameTypes.PAYLOAD,
	                flags: Frames_1.Flags.NEXT | Frames_1.Flags.COMPLETE | (payload.metadata ? Frames_1.Flags.METADATA : 0),
	                data: payload.data,
	                metadata: payload.metadata,
	                streamId: this.streamId,
	            });
	        }
	        this.stream.disconnect(this);
	    };
	    RequestResponseResponderStream.prototype.onComplete = function () {
	        if (this.done) {
	            return;
	        }
	        this.done = true;
	        this.stream.send({
	            type: Frames_1.FrameTypes.PAYLOAD,
	            flags: Frames_1.Flags.COMPLETE,
	            streamId: this.streamId,
	            data: null,
	            metadata: null,
	        });
	        this.stream.disconnect(this);
	    };
	    RequestResponseResponderStream.prototype.onExtension = function (extendedType, content, canBeIgnored) {
	        if (this.done) {
	            return;
	        }
	        this.stream.send({
	            type: Frames_1.FrameTypes.EXT,
	            streamId: this.streamId,
	            flags: canBeIgnored ? Frames_1.Flags.IGNORE : Frames_1.Flags.NONE,
	            extendedType: extendedType,
	            extendedContent: content,
	        });
	    };
	    RequestResponseResponderStream.prototype.close = function (error) {
	        var _a;
	        if (this.done) {
	            console.warn("Trying to close for the second time. ".concat(error ? "Dropping error [".concat(error, "].") : ""));
	            return;
	        }
	        Reassembler.cancel(this);
	        (_a = this.receiver) === null || _a === void 0 ? void 0 : _a.cancel();
	    };
	    return RequestResponseResponderStream;
	}());
	RequestResponseStream.RequestResponseResponderStream = RequestResponseResponderStream;
	
	return RequestResponseStream;
}

var RequestStreamStream = {};

var hasRequiredRequestStreamStream;

function requireRequestStreamStream () {
	if (hasRequiredRequestStreamStream) return RequestStreamStream;
	hasRequiredRequestStreamStream = 1;
	/*
	 * Copyright 2021-2022 the original author or authors.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */
	var __createBinding = (RequestStreamStream && RequestStreamStream.__createBinding) || (Object.create ? (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
	}) : (function(o, m, k, k2) {
	    if (k2 === undefined) k2 = k;
	    o[k2] = m[k];
	}));
	var __setModuleDefault = (RequestStreamStream && RequestStreamStream.__setModuleDefault) || (Object.create ? (function(o, v) {
	    Object.defineProperty(o, "default", { enumerable: true, value: v });
	}) : function(o, v) {
	    o["default"] = v;
	});
	var __importStar = (RequestStreamStream && RequestStreamStream.__importStar) || function (mod) {
	    if (mod && mod.__esModule) return mod;
	    var result = {};
	    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
	    __setModuleDefault(result, mod);
	    return result;
	};
	var __values = (RequestStreamStream && RequestStreamStream.__values) || function(o) {
	    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
	    if (m) return m.call(o);
	    if (o && typeof o.length === "number") return {
	        next: function () {
	            if (o && i >= o.length) o = void 0;
	            return { value: o && o[i++], done: !o };
	        }
	    };
	    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
	};
	Object.defineProperty(RequestStreamStream, "__esModule", { value: true });
	RequestStreamStream.RequestStreamResponderStream = RequestStreamStream.RequestStreamRequesterStream = void 0;
	var Errors_1 = requireErrors();
	var Fragmenter_1 = requireFragmenter();
	var Frames_1 = requireFrames();
	var Reassembler = __importStar(requireReassembler());
	var RequestStreamRequesterStream = /** @class */ (function () {
	    function RequestStreamRequesterStream(payload, receiver, fragmentSize, initialRequestN, leaseManager) {
	        this.payload = payload;
	        this.receiver = receiver;
	        this.fragmentSize = fragmentSize;
	        this.initialRequestN = initialRequestN;
	        this.leaseManager = leaseManager;
	        this.streamType = Frames_1.FrameTypes.REQUEST_STREAM;
	        // TODO: add payload size validation
	    }
	    RequestStreamRequesterStream.prototype.handleReady = function (streamId, stream) {
	        var e_1, _a;
	        if (this.done) {
	            return false;
	        }
	        this.streamId = streamId;
	        this.stream = stream;
	        stream.connect(this);
	        if ((0, Fragmenter_1.isFragmentable)(this.payload, this.fragmentSize, Frames_1.FrameTypes.REQUEST_STREAM)) {
	            try {
	                for (var _b = __values((0, Fragmenter_1.fragmentWithRequestN)(streamId, this.payload, this.fragmentSize, Frames_1.FrameTypes.REQUEST_STREAM, this.initialRequestN)), _c = _b.next(); !_c.done; _c = _b.next()) {
	                    var frame = _c.value;
	                    this.stream.send(frame);
	                }
	            }
	            catch (e_1_1) { e_1 = { error: e_1_1 }; }
	            finally {
	                try {
	                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
	                }
	                finally { if (e_1) throw e_1.error; }
	            }
	        }
	        else {
	            this.stream.send({
	                type: Frames_1.FrameTypes.REQUEST_STREAM,
	                data: this.payload.data,
	                metadata: this.payload.metadata,
	                requestN: this.initialRequestN,
	                flags: this.payload.metadata !== undefined ? Frames_1.Flags.METADATA : 0,
	                streamId: streamId,
	            });
	        }
	        if (this.hasExtension) {
	            this.stream.send({
	                type: Frames_1.FrameTypes.EXT,
	                streamId: streamId,
	                extendedContent: this.extendedContent,
	                extendedType: this.extendedType,
	                flags: this.flags,
	            });
	        }
	        return true;
	    };
	    RequestStreamRequesterStream.prototype.handleReject = function (error) {
	        if (this.done) {
	            return;
	        }
	        this.done = true;
	        this.receiver.onError(error);
	    };
	    RequestStreamRequesterStream.prototype.handle = function (frame) {
	        var errorMessage;
	        var frameType = frame.type;
	        switch (frameType) {
	            case Frames_1.FrameTypes.PAYLOAD: {
	                var hasComplete = Frames_1.Flags.hasComplete(frame.flags);
	                var hasNext = Frames_1.Flags.hasNext(frame.flags);
	                if (hasComplete || !Frames_1.Flags.hasFollows(frame.flags)) {
	                    if (hasComplete) {
	                        this.done = true;
	                        this.stream.disconnect(this);
	                        if (!hasNext) {
	                            // TODO: add validation no frame in reassembly
	                            this.receiver.onComplete();
	                            return;
	                        }
	                    }
	                    var payload = this.hasFragments
	                        ? Reassembler.reassemble(this, frame.data, frame.metadata)
	                        : {
	                            data: frame.data,
	                            metadata: frame.metadata,
	                        };
	                    this.receiver.onNext(payload, hasComplete);
	                    return;
	                }
	                if (!Reassembler.add(this, frame.data, frame.metadata)) {
	                    errorMessage = "Unexpected fragment size";
	                    break;
	                }
	                return;
	            }
	            case Frames_1.FrameTypes.ERROR: {
	                this.done = true;
	                this.stream.disconnect(this);
	                Reassembler.cancel(this);
	                this.receiver.onError(new Errors_1.RSocketError(frame.code, frame.message));
	                return;
	            }
	            case Frames_1.FrameTypes.EXT: {
	                if (this.hasFragments) {
	                    errorMessage = "Unexpected frame type [".concat(frameType, "] during reassembly");
	                    break;
	                }
	                this.receiver.onExtension(frame.extendedType, frame.extendedContent, Frames_1.Flags.hasIgnore(frame.flags));
	                return;
	            }
	            default: {
	                errorMessage = "Unexpected frame type [".concat(frameType, "]");
	            }
	        }
	        this.close(new Errors_1.RSocketError(Errors_1.ErrorCodes.CANCELED, errorMessage));
	        this.stream.send({
	            type: Frames_1.FrameTypes.CANCEL,
	            streamId: this.streamId,
	            flags: Frames_1.Flags.NONE,
	        });
	        this.stream.disconnect(this);
	        // TODO: throw an exception if strict frame handling mode
	    };
	    RequestStreamRequesterStream.prototype.request = function (n) {
	        if (this.done) {
	            return;
	        }
	        if (!this.streamId) {
	            this.initialRequestN += n;
	            return;
	        }
	        this.stream.send({
	            type: Frames_1.FrameTypes.REQUEST_N,
	            flags: Frames_1.Flags.NONE,
	            requestN: n,
	            streamId: this.streamId,
	        });
	    };
	    RequestStreamRequesterStream.prototype.cancel = function () {
	        var _a;
	        if (this.done) {
	            return;
	        }
	        this.done = true;
	        if (!this.streamId) {
	            (_a = this.leaseManager) === null || _a === void 0 ? void 0 : _a.cancelRequest(this);
	            return;
	        }
	        this.stream.send({
	            type: Frames_1.FrameTypes.CANCEL,
	            flags: Frames_1.Flags.NONE,
	            streamId: this.streamId,
	        });
	        this.stream.disconnect(this);
	        Reassembler.cancel(this);
	    };
	    RequestStreamRequesterStream.prototype.onExtension = function (extendedType, content, canBeIgnored) {
	        if (this.done) {
	            return;
	        }
	        if (!this.streamId) {
	            this.hasExtension = true;
	            this.extendedType = extendedType;
	            this.extendedContent = content;
	            this.flags = canBeIgnored ? Frames_1.Flags.IGNORE : Frames_1.Flags.NONE;
	            return;
	        }
	        this.stream.send({
	            streamId: this.streamId,
	            type: Frames_1.FrameTypes.EXT,
	            extendedType: extendedType,
	            extendedContent: content,
	            flags: canBeIgnored ? Frames_1.Flags.IGNORE : Frames_1.Flags.NONE,
	        });
	    };
	    RequestStreamRequesterStream.prototype.close = function (error) {
	        if (this.done) {
	            return;
	        }
	        this.done = true;
	        Reassembler.cancel(this);
	        if (error) {
	            this.receiver.onError(error);
	        }
	        else {
	            this.receiver.onComplete();
	        }
	    };
	    return RequestStreamRequesterStream;
	}());
	RequestStreamStream.RequestStreamRequesterStream = RequestStreamRequesterStream;
	var RequestStreamResponderStream = /** @class */ (function () {
	    function RequestStreamResponderStream(streamId, stream, fragmentSize, handler, frame) {
	        this.streamId = streamId;
	        this.stream = stream;
	        this.fragmentSize = fragmentSize;
	        this.handler = handler;
	        this.streamType = Frames_1.FrameTypes.REQUEST_STREAM;
	        stream.connect(this);
	        if (Frames_1.Flags.hasFollows(frame.flags)) {
	            this.initialRequestN = frame.requestN;
	            Reassembler.add(this, frame.data, frame.metadata);
	            return;
	        }
	        var payload = {
	            data: frame.data,
	            metadata: frame.metadata,
	        };
	        try {
	            this.receiver = handler(payload, frame.requestN, this);
	        }
	        catch (error) {
	            this.onError(error);
	        }
	    }
	    RequestStreamResponderStream.prototype.handle = function (frame) {
	        var _a;
	        var errorMessage;
	        if (!this.receiver || this.hasFragments) {
	            if (frame.type === Frames_1.FrameTypes.PAYLOAD) {
	                if (Frames_1.Flags.hasFollows(frame.flags)) {
	                    if (Reassembler.add(this, frame.data, frame.metadata)) {
	                        return;
	                    }
	                    errorMessage = "Unexpected frame size";
	                }
	                else {
	                    var payload = Reassembler.reassemble(this, frame.data, frame.metadata);
	                    try {
	                        this.receiver = this.handler(payload, this.initialRequestN, this);
	                    }
	                    catch (error) {
	                        this.onError(error);
	                    }
	                    return;
	                }
	            }
	            else {
	                errorMessage = "Unexpected frame type [".concat(frame.type, "] during reassembly");
	            }
	        }
	        else if (frame.type === Frames_1.FrameTypes.REQUEST_N) {
	            this.receiver.request(frame.requestN);
	            return;
	        }
	        else if (frame.type === Frames_1.FrameTypes.EXT) {
	            this.receiver.onExtension(frame.extendedType, frame.extendedContent, Frames_1.Flags.hasIgnore(frame.flags));
	            return;
	        }
	        else {
	            errorMessage = "Unexpected frame type [".concat(frame.type, "]");
	        }
	        this.done = true;
	        Reassembler.cancel(this);
	        (_a = this.receiver) === null || _a === void 0 ? void 0 : _a.cancel();
	        if (frame.type !== Frames_1.FrameTypes.CANCEL && frame.type !== Frames_1.FrameTypes.ERROR) {
	            this.stream.send({
	                type: Frames_1.FrameTypes.ERROR,
	                flags: Frames_1.Flags.NONE,
	                code: Errors_1.ErrorCodes.CANCELED,
	                message: errorMessage,
	                streamId: this.streamId,
	            });
	        }
	        this.stream.disconnect(this);
	        // TODO: throws if strict
	    };
	    RequestStreamResponderStream.prototype.onError = function (error) {
	        if (this.done) {
	            console.warn("Trying to error for the second time. ".concat(error ? "Dropping error [".concat(error, "].") : ""));
	            return;
	        }
	        this.done = true;
	        this.stream.send({
	            type: Frames_1.FrameTypes.ERROR,
	            flags: Frames_1.Flags.NONE,
	            code: error instanceof Errors_1.RSocketError
	                ? error.code
	                : Errors_1.ErrorCodes.APPLICATION_ERROR,
	            message: error.message,
	            streamId: this.streamId,
	        });
	        this.stream.disconnect(this);
	    };
	    RequestStreamResponderStream.prototype.onNext = function (payload, isCompletion) {
	        var e_2, _a;
	        if (this.done) {
	            return;
	        }
	        if (isCompletion) {
	            this.done = true;
	        }
	        // TODO: add payload size validation
	        if ((0, Fragmenter_1.isFragmentable)(payload, this.fragmentSize, Frames_1.FrameTypes.PAYLOAD)) {
	            try {
	                for (var _b = __values((0, Fragmenter_1.fragment)(this.streamId, payload, this.fragmentSize, Frames_1.FrameTypes.PAYLOAD, isCompletion)), _c = _b.next(); !_c.done; _c = _b.next()) {
	                    var frame = _c.value;
	                    this.stream.send(frame);
	                }
	            }
	            catch (e_2_1) { e_2 = { error: e_2_1 }; }
	            finally {
	                try {
	                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
	                }
	                finally { if (e_2) throw e_2.error; }
	            }
	        }
	        else {
	            this.stream.send({
	                type: Frames_1.FrameTypes.PAYLOAD,
	                flags: Frames_1.Flags.NEXT |
	                    (isCompletion ? Frames_1.Flags.COMPLETE : Frames_1.Flags.NONE) |
	                    (payload.metadata ? Frames_1.Flags.METADATA : Frames_1.Flags.NONE),
	                data: payload.data,
	                metadata: payload.metadata,
	                streamId: this.streamId,
	            });
	        }
	        if (isCompletion) {
	            this.stream.disconnect(this);
	        }
	    };
	    RequestStreamResponderStream.prototype.onComplete = function () {
	        if (this.done) {
	            return;
	        }
	        this.done = true;
	        this.stream.send({
	            type: Frames_1.FrameTypes.PAYLOAD,
	            flags: Frames_1.Flags.COMPLETE,
	            streamId: this.streamId,
	            data: null,
	            metadata: null,
	        });
	        this.stream.disconnect(this);
	    };
	    RequestStreamResponderStream.prototype.onExtension = function (extendedType, content, canBeIgnored) {
	        if (this.done) {
	            return;
	        }
	        this.stream.send({
	            type: Frames_1.FrameTypes.EXT,
	            streamId: this.streamId,
	            flags: canBeIgnored ? Frames_1.Flags.IGNORE : Frames_1.Flags.NONE,
	            extendedType: extendedType,
	            extendedContent: content,
	        });
	    };
	    RequestStreamResponderStream.prototype.close = function (error) {
	        var _a;
	        if (this.done) {
	            console.warn("Trying to close for the second time. ".concat(error ? "Dropping error [".concat(error, "].") : ""));
	            return;
	        }
	        Reassembler.cancel(this);
	        (_a = this.receiver) === null || _a === void 0 ? void 0 : _a.cancel();
	    };
	    return RequestStreamResponderStream;
	}());
	RequestStreamStream.RequestStreamResponderStream = RequestStreamResponderStream;
	
	return RequestStreamStream;
}

var hasRequiredRSocketSupport;

function requireRSocketSupport () {
	if (hasRequiredRSocketSupport) return RSocketSupport;
	hasRequiredRSocketSupport = 1;
	/*
	 * Copyright 2021-2022 the original author or authors.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */
	Object.defineProperty(RSocketSupport, "__esModule", { value: true });
	RSocketSupport.KeepAliveSender = RSocketSupport.KeepAliveHandler = RSocketSupport.DefaultConnectionFrameHandler = RSocketSupport.DefaultStreamRequestHandler = RSocketSupport.LeaseHandler = RSocketSupport.RSocketRequester = void 0;
	var Errors_1 = requireErrors();
	var Frames_1 = requireFrames();
	var RequestChannelStream_1 = requireRequestChannelStream();
	var RequestFnFStream_1 = requireRequestFnFStream();
	var RequestResponseStream_1 = requireRequestResponseStream();
	var RequestStreamStream_1 = requireRequestStreamStream();
	var RSocketRequester = /** @class */ (function () {
	    function RSocketRequester(connection, fragmentSize, leaseManager) {
	        this.connection = connection;
	        this.fragmentSize = fragmentSize;
	        this.leaseManager = leaseManager;
	    }
	    RSocketRequester.prototype.fireAndForget = function (payload, responderStream) {
	        var handler = new RequestFnFStream_1.RequestFnFRequesterStream(payload, responderStream, this.fragmentSize, this.leaseManager);
	        if (this.leaseManager) {
	            this.leaseManager.requestLease(handler);
	        }
	        else {
	            this.connection.multiplexerDemultiplexer.createRequestStream(handler);
	        }
	        return handler;
	    };
	    RSocketRequester.prototype.requestResponse = function (payload, responderStream) {
	        var handler = new RequestResponseStream_1.RequestResponseRequesterStream(payload, responderStream, this.fragmentSize, this.leaseManager);
	        if (this.leaseManager) {
	            this.leaseManager.requestLease(handler);
	        }
	        else {
	            this.connection.multiplexerDemultiplexer.createRequestStream(handler);
	        }
	        return handler;
	    };
	    RSocketRequester.prototype.requestStream = function (payload, initialRequestN, responderStream) {
	        var handler = new RequestStreamStream_1.RequestStreamRequesterStream(payload, responderStream, this.fragmentSize, initialRequestN, this.leaseManager);
	        if (this.leaseManager) {
	            this.leaseManager.requestLease(handler);
	        }
	        else {
	            this.connection.multiplexerDemultiplexer.createRequestStream(handler);
	        }
	        return handler;
	    };
	    RSocketRequester.prototype.requestChannel = function (payload, initialRequestN, isCompleted, responderStream) {
	        var handler = new RequestChannelStream_1.RequestChannelRequesterStream(payload, isCompleted, responderStream, this.fragmentSize, initialRequestN, this.leaseManager);
	        if (this.leaseManager) {
	            this.leaseManager.requestLease(handler);
	        }
	        else {
	            this.connection.multiplexerDemultiplexer.createRequestStream(handler);
	        }
	        return handler;
	    };
	    RSocketRequester.prototype.metadataPush = function (metadata, responderStream) {
	        throw new Error("Method not implemented.");
	    };
	    RSocketRequester.prototype.close = function (error) {
	        this.connection.close(error);
	    };
	    RSocketRequester.prototype.onClose = function (callback) {
	        this.connection.onClose(callback);
	    };
	    return RSocketRequester;
	}());
	RSocketSupport.RSocketRequester = RSocketRequester;
	var LeaseHandler = /** @class */ (function () {
	    function LeaseHandler(maxPendingRequests, multiplexer) {
	        this.maxPendingRequests = maxPendingRequests;
	        this.multiplexer = multiplexer;
	        this.pendingRequests = [];
	        this.expirationTime = 0;
	        this.availableLease = 0;
	    }
	    LeaseHandler.prototype.handle = function (frame) {
	        this.expirationTime = frame.ttl + Date.now();
	        this.availableLease = frame.requestCount;
	        while (this.availableLease > 0 && this.pendingRequests.length > 0) {
	            var handler = this.pendingRequests.shift();
	            this.availableLease--;
	            this.multiplexer.createRequestStream(handler);
	        }
	    };
	    LeaseHandler.prototype.requestLease = function (handler) {
	        var availableLease = this.availableLease;
	        if (availableLease > 0 && Date.now() < this.expirationTime) {
	            this.availableLease = availableLease - 1;
	            this.multiplexer.createRequestStream(handler);
	            return;
	        }
	        if (this.pendingRequests.length >= this.maxPendingRequests) {
	            handler.handleReject(new Errors_1.RSocketError(Errors_1.ErrorCodes.REJECTED, "No available lease given"));
	            return;
	        }
	        this.pendingRequests.push(handler);
	    };
	    LeaseHandler.prototype.cancelRequest = function (handler) {
	        var index = this.pendingRequests.indexOf(handler);
	        if (index > -1) {
	            this.pendingRequests.splice(index, 1);
	        }
	    };
	    return LeaseHandler;
	}());
	RSocketSupport.LeaseHandler = LeaseHandler;
	var DefaultStreamRequestHandler = /** @class */ (function () {
	    function DefaultStreamRequestHandler(rsocket, fragmentSize) {
	        this.rsocket = rsocket;
	        this.fragmentSize = fragmentSize;
	    }
	    DefaultStreamRequestHandler.prototype.handle = function (frame, stream) {
	        switch (frame.type) {
	            case Frames_1.FrameTypes.REQUEST_FNF:
	                if (this.rsocket.fireAndForget) {
	                    new RequestFnFStream_1.RequestFnfResponderStream(frame.streamId, stream, this.rsocket.fireAndForget.bind(this.rsocket), frame);
	                }
	                return;
	            case Frames_1.FrameTypes.REQUEST_RESPONSE:
	                if (this.rsocket.requestResponse) {
	                    new RequestResponseStream_1.RequestResponseResponderStream(frame.streamId, stream, this.fragmentSize, this.rsocket.requestResponse.bind(this.rsocket), frame);
	                    return;
	                }
	                this.rejectRequest(frame.streamId, stream);
	                return;
	            case Frames_1.FrameTypes.REQUEST_STREAM:
	                if (this.rsocket.requestStream) {
	                    new RequestStreamStream_1.RequestStreamResponderStream(frame.streamId, stream, this.fragmentSize, this.rsocket.requestStream.bind(this.rsocket), frame);
	                    return;
	                }
	                this.rejectRequest(frame.streamId, stream);
	                return;
	            case Frames_1.FrameTypes.REQUEST_CHANNEL:
	                if (this.rsocket.requestChannel) {
	                    new RequestChannelStream_1.RequestChannelResponderStream(frame.streamId, stream, this.fragmentSize, this.rsocket.requestChannel.bind(this.rsocket), frame);
	                    return;
	                }
	                this.rejectRequest(frame.streamId, stream);
	                return;
	        }
	    };
	    DefaultStreamRequestHandler.prototype.rejectRequest = function (streamId, stream) {
	        stream.send({
	            type: Frames_1.FrameTypes.ERROR,
	            streamId: streamId,
	            flags: Frames_1.Flags.NONE,
	            code: Errors_1.ErrorCodes.REJECTED,
	            message: "No available handler found",
	        });
	    };
	    DefaultStreamRequestHandler.prototype.close = function () { };
	    return DefaultStreamRequestHandler;
	}());
	RSocketSupport.DefaultStreamRequestHandler = DefaultStreamRequestHandler;
	var DefaultConnectionFrameHandler = /** @class */ (function () {
	    function DefaultConnectionFrameHandler(connection, keepAliveHandler, keepAliveSender, leaseHandler, rsocket) {
	        this.connection = connection;
	        this.keepAliveHandler = keepAliveHandler;
	        this.keepAliveSender = keepAliveSender;
	        this.leaseHandler = leaseHandler;
	        this.rsocket = rsocket;
	    }
	    DefaultConnectionFrameHandler.prototype.handle = function (frame) {
	        switch (frame.type) {
	            case Frames_1.FrameTypes.KEEPALIVE:
	                this.keepAliveHandler.handle(frame);
	                return;
	            case Frames_1.FrameTypes.LEASE:
	                if (this.leaseHandler) {
	                    this.leaseHandler.handle(frame);
	                    return;
	                }
	                // TODO throw exception and close connection
	                return;
	            case Frames_1.FrameTypes.ERROR:
	                // TODO: add code validation
	                this.connection.close(new Errors_1.RSocketError(frame.code, frame.message));
	                return;
	            case Frames_1.FrameTypes.METADATA_PUSH:
	                if (this.rsocket.metadataPush) ;
	                return;
	            default:
	                this.connection.multiplexerDemultiplexer.connectionOutbound.send({
	                    type: Frames_1.FrameTypes.ERROR,
	                    streamId: 0,
	                    flags: Frames_1.Flags.NONE,
	                    message: "Received unknown frame type",
	                    code: Errors_1.ErrorCodes.CONNECTION_ERROR,
	                });
	            // TODO: throw an exception and close connection
	        }
	    };
	    DefaultConnectionFrameHandler.prototype.pause = function () {
	        var _a;
	        this.keepAliveHandler.pause();
	        (_a = this.keepAliveSender) === null || _a === void 0 ? void 0 : _a.pause();
	    };
	    DefaultConnectionFrameHandler.prototype.resume = function () {
	        var _a;
	        this.keepAliveHandler.start();
	        (_a = this.keepAliveSender) === null || _a === void 0 ? void 0 : _a.start();
	    };
	    DefaultConnectionFrameHandler.prototype.close = function (error) {
	        var _a;
	        this.keepAliveHandler.close();
	        (_a = this.rsocket.close) === null || _a === void 0 ? void 0 : _a.call(this.rsocket, error);
	    };
	    return DefaultConnectionFrameHandler;
	}());
	RSocketSupport.DefaultConnectionFrameHandler = DefaultConnectionFrameHandler;
	var KeepAliveHandlerStates;
	(function (KeepAliveHandlerStates) {
	    KeepAliveHandlerStates[KeepAliveHandlerStates["Paused"] = 0] = "Paused";
	    KeepAliveHandlerStates[KeepAliveHandlerStates["Running"] = 1] = "Running";
	    KeepAliveHandlerStates[KeepAliveHandlerStates["Closed"] = 2] = "Closed";
	})(KeepAliveHandlerStates || (KeepAliveHandlerStates = {}));
	var KeepAliveHandler = /** @class */ (function () {
	    function KeepAliveHandler(connection, keepAliveTimeoutDuration) {
	        this.connection = connection;
	        this.keepAliveTimeoutDuration = keepAliveTimeoutDuration;
	        this.state = KeepAliveHandlerStates.Paused;
	        this.outbound = connection.multiplexerDemultiplexer.connectionOutbound;
	    }
	    KeepAliveHandler.prototype.handle = function (frame) {
	        this.keepAliveLastReceivedMillis = Date.now();
	        if (Frames_1.Flags.hasRespond(frame.flags)) {
	            this.outbound.send({
	                type: Frames_1.FrameTypes.KEEPALIVE,
	                streamId: 0,
	                data: frame.data,
	                flags: frame.flags ^ Frames_1.Flags.RESPOND,
	                lastReceivedPosition: 0,
	            });
	        }
	    };
	    KeepAliveHandler.prototype.start = function () {
	        if (this.state !== KeepAliveHandlerStates.Paused) {
	            return;
	        }
	        this.keepAliveLastReceivedMillis = Date.now();
	        this.state = KeepAliveHandlerStates.Running;
	        this.activeTimeout = setTimeout(this.timeoutCheck.bind(this), this.keepAliveTimeoutDuration);
	    };
	    KeepAliveHandler.prototype.pause = function () {
	        if (this.state !== KeepAliveHandlerStates.Running) {
	            return;
	        }
	        this.state = KeepAliveHandlerStates.Paused;
	        clearTimeout(this.activeTimeout);
	    };
	    KeepAliveHandler.prototype.close = function () {
	        this.state = KeepAliveHandlerStates.Closed;
	        clearTimeout(this.activeTimeout);
	    };
	    KeepAliveHandler.prototype.timeoutCheck = function () {
	        var now = Date.now();
	        var noKeepAliveDuration = now - this.keepAliveLastReceivedMillis;
	        if (noKeepAliveDuration >= this.keepAliveTimeoutDuration) {
	            this.connection.close(new Error("No keep-alive acks for ".concat(this.keepAliveTimeoutDuration, " millis")));
	        }
	        else {
	            this.activeTimeout = setTimeout(this.timeoutCheck.bind(this), Math.max(100, this.keepAliveTimeoutDuration - noKeepAliveDuration));
	        }
	    };
	    return KeepAliveHandler;
	}());
	RSocketSupport.KeepAliveHandler = KeepAliveHandler;
	var KeepAliveSenderStates;
	(function (KeepAliveSenderStates) {
	    KeepAliveSenderStates[KeepAliveSenderStates["Paused"] = 0] = "Paused";
	    KeepAliveSenderStates[KeepAliveSenderStates["Running"] = 1] = "Running";
	    KeepAliveSenderStates[KeepAliveSenderStates["Closed"] = 2] = "Closed";
	})(KeepAliveSenderStates || (KeepAliveSenderStates = {}));
	var KeepAliveSender = /** @class */ (function () {
	    function KeepAliveSender(outbound, keepAlivePeriodDuration) {
	        this.outbound = outbound;
	        this.keepAlivePeriodDuration = keepAlivePeriodDuration;
	        this.state = KeepAliveSenderStates.Paused;
	    }
	    KeepAliveSender.prototype.sendKeepAlive = function () {
	        this.outbound.send({
	            type: Frames_1.FrameTypes.KEEPALIVE,
	            streamId: 0,
	            data: undefined,
	            flags: Frames_1.Flags.RESPOND,
	            lastReceivedPosition: 0,
	        });
	    };
	    KeepAliveSender.prototype.start = function () {
	        if (this.state !== KeepAliveSenderStates.Paused) {
	            return;
	        }
	        this.state = KeepAliveSenderStates.Running;
	        this.activeInterval = setInterval(this.sendKeepAlive.bind(this), this.keepAlivePeriodDuration);
	    };
	    KeepAliveSender.prototype.pause = function () {
	        if (this.state !== KeepAliveSenderStates.Running) {
	            return;
	        }
	        this.state = KeepAliveSenderStates.Paused;
	        clearInterval(this.activeInterval);
	    };
	    KeepAliveSender.prototype.close = function () {
	        this.state = KeepAliveSenderStates.Closed;
	        clearInterval(this.activeInterval);
	    };
	    return KeepAliveSender;
	}());
	RSocketSupport.KeepAliveSender = KeepAliveSender;
	
	return RSocketSupport;
}

var Resume = {};

var hasRequiredResume;

function requireResume () {
	if (hasRequiredResume) return Resume;
	hasRequiredResume = 1;
	/*
	 * Copyright 2021-2022 the original author or authors.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */
	var __values = (Resume && Resume.__values) || function(o) {
	    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
	    if (m) return m.call(o);
	    if (o && typeof o.length === "number") return {
	        next: function () {
	            if (o && i >= o.length) o = void 0;
	            return { value: o && o[i++], done: !o };
	        }
	    };
	    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
	};
	Object.defineProperty(Resume, "__esModule", { value: true });
	Resume.FrameStore = void 0;
	var _1 = requireDist();
	var Codecs_1 = requireCodecs();
	var FrameStore = /** @class */ (function () {
	    function FrameStore() {
	        this.storedFrames = [];
	        this._lastReceivedFramePosition = 0;
	        this._firstAvailableFramePosition = 0;
	        this._lastSentFramePosition = 0;
	    }
	    Object.defineProperty(FrameStore.prototype, "lastReceivedFramePosition", {
	        get: function () {
	            return this._lastReceivedFramePosition;
	        },
	        enumerable: false,
	        configurable: true
	    });
	    Object.defineProperty(FrameStore.prototype, "firstAvailableFramePosition", {
	        get: function () {
	            return this._firstAvailableFramePosition;
	        },
	        enumerable: false,
	        configurable: true
	    });
	    Object.defineProperty(FrameStore.prototype, "lastSentFramePosition", {
	        get: function () {
	            return this._lastSentFramePosition;
	        },
	        enumerable: false,
	        configurable: true
	    });
	    FrameStore.prototype.store = function (frame) {
	        this._lastSentFramePosition += (0, Codecs_1.sizeOfFrame)(frame);
	        this.storedFrames.push(frame);
	    };
	    FrameStore.prototype.record = function (frame) {
	        this._lastReceivedFramePosition += (0, Codecs_1.sizeOfFrame)(frame);
	    };
	    FrameStore.prototype.dropTo = function (lastReceivedPosition) {
	        var bytesToDrop = lastReceivedPosition - this._firstAvailableFramePosition;
	        while (bytesToDrop > 0 && this.storedFrames.length > 0) {
	            var storedFrame = this.storedFrames.shift();
	            bytesToDrop -= (0, Codecs_1.sizeOfFrame)(storedFrame);
	        }
	        if (bytesToDrop !== 0) {
	            throw new _1.RSocketError(_1.ErrorCodes.CONNECTION_ERROR, "State inconsistency. Expected bytes to drop ".concat(lastReceivedPosition - this._firstAvailableFramePosition, " but actual ").concat(bytesToDrop));
	        }
	        this._firstAvailableFramePosition = lastReceivedPosition;
	    };
	    FrameStore.prototype.drain = function (consumer) {
	        var e_1, _a;
	        try {
	            for (var _b = __values(this.storedFrames), _c = _b.next(); !_c.done; _c = _b.next()) {
	                var frame = _c.value;
	                consumer(frame);
	            }
	        }
	        catch (e_1_1) { e_1 = { error: e_1_1 }; }
	        finally {
	            try {
	                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
	            }
	            finally { if (e_1) throw e_1.error; }
	        }
	    };
	    return FrameStore;
	}());
	Resume.FrameStore = FrameStore;
	
	return Resume;
}

var hasRequiredRSocketConnector;

function requireRSocketConnector () {
	if (hasRequiredRSocketConnector) return RSocketConnector;
	hasRequiredRSocketConnector = 1;
	/*
	 * Copyright 2021-2022 the original author or authors.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */
	var __awaiter = (RSocketConnector && RSocketConnector.__awaiter) || function (thisArg, _arguments, P, generator) {
	    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
	    return new (P || (P = Promise))(function (resolve, reject) {
	        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
	        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
	        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
	        step((generator = generator.apply(thisArg, _arguments || [])).next());
	    });
	};
	var __generator = (RSocketConnector && RSocketConnector.__generator) || function (thisArg, body) {
	    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
	    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
	    function verb(n) { return function (v) { return step([n, v]); }; }
	    function step(op) {
	        if (f) throw new TypeError("Generator is already executing.");
	        while (_) try {
	            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
	            if (y = 0, t) op = [op[0] & 2, t.value];
	            switch (op[0]) {
	                case 0: case 1: t = op; break;
	                case 4: _.label++; return { value: op[1], done: false };
	                case 5: _.label++; y = op[1]; op = [0]; continue;
	                case 7: op = _.ops.pop(); _.trys.pop(); continue;
	                default:
	                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
	                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
	                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
	                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
	                    if (t[2]) _.ops.pop();
	                    _.trys.pop(); continue;
	            }
	            op = body.call(thisArg, _);
	        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
	        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
	    }
	};
	Object.defineProperty(RSocketConnector, "__esModule", { value: true });
	RSocketConnector.RSocketConnector = void 0;
	var ClientServerMultiplexerDemultiplexer_1 = requireClientServerMultiplexerDemultiplexer();
	var Frames_1 = requireFrames();
	var RSocketSupport_1 = requireRSocketSupport();
	var Resume_1 = requireResume();
	var RSocketConnector$1 = /** @class */ (function () {
	    function RSocketConnector(config) {
	        this.config = config;
	    }
	    RSocketConnector.prototype.connect = function () {
	        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
	        return __awaiter(this, void 0, void 0, function () {
	            var config, setupFrame, connection, keepAliveSender, keepAliveHandler, leaseHandler, responder, connectionFrameHandler, streamsHandler;
	            var _this = this;
	            return __generator(this, function (_w) {
	                switch (_w.label) {
	                    case 0:
	                        config = this.config;
	                        setupFrame = {
	                            type: Frames_1.FrameTypes.SETUP,
	                            dataMimeType: (_b = (_a = config.setup) === null || _a === void 0 ? void 0 : _a.dataMimeType) !== null && _b !== void 0 ? _b : "application/octet-stream",
	                            metadataMimeType: (_d = (_c = config.setup) === null || _c === void 0 ? void 0 : _c.metadataMimeType) !== null && _d !== void 0 ? _d : "application/octet-stream",
	                            keepAlive: (_f = (_e = config.setup) === null || _e === void 0 ? void 0 : _e.keepAlive) !== null && _f !== void 0 ? _f : 60000,
	                            lifetime: (_h = (_g = config.setup) === null || _g === void 0 ? void 0 : _g.lifetime) !== null && _h !== void 0 ? _h : 300000,
	                            metadata: (_k = (_j = config.setup) === null || _j === void 0 ? void 0 : _j.payload) === null || _k === void 0 ? void 0 : _k.metadata,
	                            data: (_m = (_l = config.setup) === null || _l === void 0 ? void 0 : _l.payload) === null || _m === void 0 ? void 0 : _m.data,
	                            resumeToken: (_p = (_o = config.resume) === null || _o === void 0 ? void 0 : _o.tokenGenerator()) !== null && _p !== void 0 ? _p : null,
	                            streamId: 0,
	                            majorVersion: 1,
	                            minorVersion: 0,
	                            flags: (((_r = (_q = config.setup) === null || _q === void 0 ? void 0 : _q.payload) === null || _r === void 0 ? void 0 : _r.metadata) ? Frames_1.Flags.METADATA : Frames_1.Flags.NONE) |
	                                (config.lease ? Frames_1.Flags.LEASE : Frames_1.Flags.NONE) |
	                                (config.resume ? Frames_1.Flags.RESUME_ENABLE : Frames_1.Flags.NONE),
	                        };
	                        return [4 /*yield*/, config.transport.connect(function (outbound) {
	                                return config.resume
	                                    ? new ClientServerMultiplexerDemultiplexer_1.ResumableClientServerInputMultiplexerDemultiplexer(ClientServerMultiplexerDemultiplexer_1.StreamIdGenerator.create(-1), outbound, outbound, new Resume_1.FrameStore(), // TODO: add size control
	                                    setupFrame.resumeToken.toString(), function (self, frameStore) { return __awaiter(_this, void 0, void 0, function () {
	                                        var multiplexerDemultiplexerProvider, reconnectionAttempts, reconnector;
	                                        return __generator(this, function (_a) {
	                                            switch (_a.label) {
	                                                case 0:
	                                                    multiplexerDemultiplexerProvider = function (outbound) {
	                                                        outbound.send({
	                                                            type: Frames_1.FrameTypes.RESUME,
	                                                            streamId: 0,
	                                                            flags: Frames_1.Flags.NONE,
	                                                            clientPosition: frameStore.firstAvailableFramePosition,
	                                                            serverPosition: frameStore.lastReceivedFramePosition,
	                                                            majorVersion: setupFrame.minorVersion,
	                                                            minorVersion: setupFrame.majorVersion,
	                                                            resumeToken: setupFrame.resumeToken,
	                                                        });
	                                                        return new ClientServerMultiplexerDemultiplexer_1.ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer(outbound, outbound, self);
	                                                    };
	                                                    reconnectionAttempts = -1;
	                                                    reconnector = function () {
	                                                        reconnectionAttempts++;
	                                                        return config.resume
	                                                            .reconnectFunction(reconnectionAttempts)
	                                                            .then(function () {
	                                                            return config.transport
	                                                                .connect(multiplexerDemultiplexerProvider)
	                                                                .catch(reconnector);
	                                                        });
	                                                    };
	                                                    return [4 /*yield*/, reconnector()];
	                                                case 1:
	                                                    _a.sent();
	                                                    return [2 /*return*/];
	                                            }
	                                        });
	                                    }); })
	                                    : new ClientServerMultiplexerDemultiplexer_1.ClientServerInputMultiplexerDemultiplexer(ClientServerMultiplexerDemultiplexer_1.StreamIdGenerator.create(-1), outbound, outbound);
	                            })];
	                    case 1:
	                        connection = _w.sent();
	                        keepAliveSender = new RSocketSupport_1.KeepAliveSender(connection.multiplexerDemultiplexer.connectionOutbound, setupFrame.keepAlive);
	                        keepAliveHandler = new RSocketSupport_1.KeepAliveHandler(connection, setupFrame.lifetime);
	                        leaseHandler = config.lease
	                            ? new RSocketSupport_1.LeaseHandler((_s = config.lease.maxPendingRequests) !== null && _s !== void 0 ? _s : 256, connection.multiplexerDemultiplexer)
	                            : undefined;
	                        responder = (_t = config.responder) !== null && _t !== void 0 ? _t : {};
	                        connectionFrameHandler = new RSocketSupport_1.DefaultConnectionFrameHandler(connection, keepAliveHandler, keepAliveSender, leaseHandler, responder);
	                        streamsHandler = new RSocketSupport_1.DefaultStreamRequestHandler(responder, 0);
	                        connection.onClose(function (e) {
	                            keepAliveSender.close();
	                            keepAliveHandler.close();
	                            connectionFrameHandler.close(e);
	                        });
	                        connection.multiplexerDemultiplexer.connectionInbound(connectionFrameHandler);
	                        connection.multiplexerDemultiplexer.handleRequestStream(streamsHandler);
	                        connection.multiplexerDemultiplexer.connectionOutbound.send(setupFrame);
	                        keepAliveHandler.start();
	                        keepAliveSender.start();
	                        return [2 /*return*/, new RSocketSupport_1.RSocketRequester(connection, (_v = (_u = config.fragmentation) === null || _u === void 0 ? void 0 : _u.maxOutboundFragmentSize) !== null && _v !== void 0 ? _v : 0, leaseHandler)];
	                }
	            });
	        });
	    };
	    return RSocketConnector;
	}());
	RSocketConnector.RSocketConnector = RSocketConnector$1;
	
	return RSocketConnector;
}

var RSocketServer = {};

var hasRequiredRSocketServer;

function requireRSocketServer () {
	if (hasRequiredRSocketServer) return RSocketServer;
	hasRequiredRSocketServer = 1;
	/*
	 * Copyright 2021-2022 the original author or authors.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */
	var __awaiter = (RSocketServer && RSocketServer.__awaiter) || function (thisArg, _arguments, P, generator) {
	    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
	    return new (P || (P = Promise))(function (resolve, reject) {
	        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
	        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
	        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
	        step((generator = generator.apply(thisArg, _arguments || [])).next());
	    });
	};
	var __generator = (RSocketServer && RSocketServer.__generator) || function (thisArg, body) {
	    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
	    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
	    function verb(n) { return function (v) { return step([n, v]); }; }
	    function step(op) {
	        if (f) throw new TypeError("Generator is already executing.");
	        while (_) try {
	            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
	            if (y = 0, t) op = [op[0] & 2, t.value];
	            switch (op[0]) {
	                case 0: case 1: t = op; break;
	                case 4: _.label++; return { value: op[1], done: false };
	                case 5: _.label++; y = op[1]; op = [0]; continue;
	                case 7: op = _.ops.pop(); _.trys.pop(); continue;
	                default:
	                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
	                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
	                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
	                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
	                    if (t[2]) _.ops.pop();
	                    _.trys.pop(); continue;
	            }
	            op = body.call(thisArg, _);
	        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
	        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
	    }
	};
	Object.defineProperty(RSocketServer, "__esModule", { value: true });
	RSocketServer.RSocketServer = void 0;
	var ClientServerMultiplexerDemultiplexer_1 = requireClientServerMultiplexerDemultiplexer();
	var Errors_1 = requireErrors();
	var Frames_1 = requireFrames();
	var RSocketSupport_1 = requireRSocketSupport();
	var Resume_1 = requireResume();
	var RSocketServer$1 = /** @class */ (function () {
	    function RSocketServer(config) {
	        var _a, _b;
	        this.acceptor = config.acceptor;
	        this.transport = config.transport;
	        this.lease = config.lease;
	        this.serverSideKeepAlive = config.serverSideKeepAlive;
	        this.sessionStore = config.resume ? {} : undefined;
	        this.sessionTimeout = (_b = (_a = config.resume) === null || _a === void 0 ? void 0 : _a.sessionTimeout) !== null && _b !== void 0 ? _b : undefined;
	    }
	    RSocketServer.prototype.bind = function () {
	        return __awaiter(this, void 0, void 0, function () {
	            var _this = this;
	            return __generator(this, function (_a) {
	                switch (_a.label) {
	                    case 0: return [4 /*yield*/, this.transport.bind(function (frame, connection) { return __awaiter(_this, void 0, void 0, function () {
	                            var _a, error, error, leaseHandler, requester, responder, keepAliveHandler_1, keepAliveSender_1, connectionFrameHandler_1, streamsHandler, e_1;
	                            var _b, _c, _d, _e;
	                            return __generator(this, function (_f) {
	                                switch (_f.label) {
	                                    case 0:
	                                        _a = frame.type;
	                                        switch (_a) {
	                                            case Frames_1.FrameTypes.SETUP: return [3 /*break*/, 1];
	                                            case Frames_1.FrameTypes.RESUME: return [3 /*break*/, 5];
	                                        }
	                                        return [3 /*break*/, 6];
	                                    case 1:
	                                        _f.trys.push([1, 3, , 4]);
	                                        if (this.lease && !Frames_1.Flags.hasLease(frame.flags)) {
	                                            error = new Errors_1.RSocketError(Errors_1.ErrorCodes.REJECTED_SETUP, "Lease has to be enabled");
	                                            connection.multiplexerDemultiplexer.connectionOutbound.send({
	                                                type: Frames_1.FrameTypes.ERROR,
	                                                streamId: 0,
	                                                flags: Frames_1.Flags.NONE,
	                                                code: error.code,
	                                                message: error.message,
	                                            });
	                                            connection.close(error);
	                                            return [2 /*return*/];
	                                        }
	                                        if (Frames_1.Flags.hasLease(frame.flags) && !this.lease) {
	                                            error = new Errors_1.RSocketError(Errors_1.ErrorCodes.REJECTED_SETUP, "Lease has to be disabled");
	                                            connection.multiplexerDemultiplexer.connectionOutbound.send({
	                                                type: Frames_1.FrameTypes.ERROR,
	                                                streamId: 0,
	                                                flags: Frames_1.Flags.NONE,
	                                                code: error.code,
	                                                message: error.message,
	                                            });
	                                            connection.close(error);
	                                            return [2 /*return*/];
	                                        }
	                                        leaseHandler = Frames_1.Flags.hasLease(frame.flags)
	                                            ? new RSocketSupport_1.LeaseHandler((_b = this.lease.maxPendingRequests) !== null && _b !== void 0 ? _b : 256, connection.multiplexerDemultiplexer)
	                                            : undefined;
	                                        requester = new RSocketSupport_1.RSocketRequester(connection, (_d = (_c = this.fragmentation) === null || _c === void 0 ? void 0 : _c.maxOutboundFragmentSize) !== null && _d !== void 0 ? _d : 0, leaseHandler);
	                                        return [4 /*yield*/, this.acceptor.accept({
	                                                data: frame.data,
	                                                dataMimeType: frame.dataMimeType,
	                                                metadata: frame.metadata,
	                                                metadataMimeType: frame.metadataMimeType,
	                                                flags: frame.flags,
	                                                keepAliveMaxLifetime: frame.lifetime,
	                                                keepAliveInterval: frame.keepAlive,
	                                                resumeToken: frame.resumeToken,
	                                            }, requester)];
	                                    case 2:
	                                        responder = _f.sent();
	                                        keepAliveHandler_1 = new RSocketSupport_1.KeepAliveHandler(connection, frame.lifetime);
	                                        keepAliveSender_1 = this.serverSideKeepAlive
	                                            ? new RSocketSupport_1.KeepAliveSender(connection.multiplexerDemultiplexer.connectionOutbound, frame.keepAlive)
	                                            : undefined;
	                                        connectionFrameHandler_1 = new RSocketSupport_1.DefaultConnectionFrameHandler(connection, keepAliveHandler_1, keepAliveSender_1, leaseHandler, responder);
	                                        streamsHandler = new RSocketSupport_1.DefaultStreamRequestHandler(responder, 0);
	                                        connection.onClose(function (e) {
	                                            keepAliveSender_1 === null || keepAliveSender_1 === void 0 ? void 0 : keepAliveSender_1.close();
	                                            keepAliveHandler_1.close();
	                                            connectionFrameHandler_1.close(e);
	                                        });
	                                        connection.multiplexerDemultiplexer.connectionInbound(connectionFrameHandler_1);
	                                        connection.multiplexerDemultiplexer.handleRequestStream(streamsHandler);
	                                        keepAliveHandler_1.start();
	                                        keepAliveSender_1 === null || keepAliveSender_1 === void 0 ? void 0 : keepAliveSender_1.start();
	                                        return [3 /*break*/, 4];
	                                    case 3:
	                                        e_1 = _f.sent();
	                                        connection.multiplexerDemultiplexer.connectionOutbound.send({
	                                            type: Frames_1.FrameTypes.ERROR,
	                                            streamId: 0,
	                                            code: Errors_1.ErrorCodes.REJECTED_SETUP,
	                                            message: (_e = e_1.message) !== null && _e !== void 0 ? _e : "",
	                                            flags: Frames_1.Flags.NONE,
	                                        });
	                                        connection.close(e_1 instanceof Errors_1.RSocketError
	                                            ? e_1
	                                            : new Errors_1.RSocketError(Errors_1.ErrorCodes.REJECTED_SETUP, e_1.message));
	                                        return [3 /*break*/, 4];
	                                    case 4: return [2 /*return*/];
	                                    case 5:
	                                        {
	                                            // frame should be handled earlier
	                                            return [2 /*return*/];
	                                        }
	                                    case 6:
	                                        {
	                                            connection.multiplexerDemultiplexer.connectionOutbound.send({
	                                                type: Frames_1.FrameTypes.ERROR,
	                                                streamId: 0,
	                                                code: Errors_1.ErrorCodes.UNSUPPORTED_SETUP,
	                                                message: "Unsupported setup",
	                                                flags: Frames_1.Flags.NONE,
	                                            });
	                                            connection.close(new Errors_1.RSocketError(Errors_1.ErrorCodes.UNSUPPORTED_SETUP));
	                                        }
	                                        _f.label = 7;
	                                    case 7: return [2 /*return*/];
	                                }
	                            });
	                        }); }, function (frame, outbound) {
	                            if (frame.type === Frames_1.FrameTypes.RESUME) {
	                                if (_this.sessionStore) {
	                                    var multiplexerDemultiplexer = _this.sessionStore[frame.resumeToken.toString()];
	                                    if (!multiplexerDemultiplexer) {
	                                        outbound.send({
	                                            type: Frames_1.FrameTypes.ERROR,
	                                            streamId: 0,
	                                            code: Errors_1.ErrorCodes.REJECTED_RESUME,
	                                            message: "No session found for the given resume token",
	                                            flags: Frames_1.Flags.NONE,
	                                        });
	                                        outbound.close();
	                                        return;
	                                    }
	                                    multiplexerDemultiplexer.resume(frame, outbound, outbound);
	                                    return multiplexerDemultiplexer;
	                                }
	                                outbound.send({
	                                    type: Frames_1.FrameTypes.ERROR,
	                                    streamId: 0,
	                                    code: Errors_1.ErrorCodes.REJECTED_RESUME,
	                                    message: "Resume is not enabled",
	                                    flags: Frames_1.Flags.NONE,
	                                });
	                                outbound.close();
	                                return;
	                            }
	                            else if (frame.type === Frames_1.FrameTypes.SETUP) {
	                                if (Frames_1.Flags.hasResume(frame.flags)) {
	                                    if (!_this.sessionStore) {
	                                        var error = new Errors_1.RSocketError(Errors_1.ErrorCodes.REJECTED_SETUP, "No resume support");
	                                        outbound.send({
	                                            type: Frames_1.FrameTypes.ERROR,
	                                            streamId: 0,
	                                            flags: Frames_1.Flags.NONE,
	                                            code: error.code,
	                                            message: error.message,
	                                        });
	                                        outbound.close(error);
	                                        return;
	                                    }
	                                    var multiplexerDumiltiplexer = new ClientServerMultiplexerDemultiplexer_1.ResumableClientServerInputMultiplexerDemultiplexer(ClientServerMultiplexerDemultiplexer_1.StreamIdGenerator.create(0), outbound, outbound, new Resume_1.FrameStore(), // TODO: add size parameter
	                                    frame.resumeToken.toString(), _this.sessionStore, _this.sessionTimeout);
	                                    _this.sessionStore[frame.resumeToken.toString()] =
	                                        multiplexerDumiltiplexer;
	                                    return multiplexerDumiltiplexer;
	                                }
	                            }
	                            return new ClientServerMultiplexerDemultiplexer_1.ClientServerInputMultiplexerDemultiplexer(ClientServerMultiplexerDemultiplexer_1.StreamIdGenerator.create(0), outbound, outbound);
	                        })];
	                    case 1: return [2 /*return*/, _a.sent()];
	                }
	            });
	        });
	    };
	    return RSocketServer;
	}());
	RSocketServer.RSocketServer = RSocketServer$1;
	
	return RSocketServer;
}

var Transport = {};

var hasRequiredTransport;

function requireTransport () {
	if (hasRequiredTransport) return Transport;
	hasRequiredTransport = 1;
	/*
	 * Copyright 2021-2022 the original author or authors.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */
	Object.defineProperty(Transport, "__esModule", { value: true });
	
	return Transport;
}

var hasRequiredDist;

function requireDist () {
	if (hasRequiredDist) return dist;
	hasRequiredDist = 1;
	(function (exports$1) {
		/*
		 * Copyright 2021-2022 the original author or authors.
		 *
		 * Licensed under the Apache License, Version 2.0 (the "License");
		 * you may not use this file except in compliance with the License.
		 * You may obtain a copy of the License at
		 *
		 *     http://www.apache.org/licenses/LICENSE-2.0
		 *
		 * Unless required by applicable law or agreed to in writing, software
		 * distributed under the License is distributed on an "AS IS" BASIS,
		 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
		 * See the License for the specific language governing permissions and
		 * limitations under the License.
		 */
		var __createBinding = (dist && dist.__createBinding) || (Object.create ? (function(o, m, k, k2) {
		    if (k2 === undefined) k2 = k;
		    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
		}) : (function(o, m, k, k2) {
		    if (k2 === undefined) k2 = k;
		    o[k2] = m[k];
		}));
		var __exportStar = (dist && dist.__exportStar) || function(m, exports$1) {
		    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports$1, p)) __createBinding(exports$1, m, p);
		};
		Object.defineProperty(exports$1, "__esModule", { value: true });
		__exportStar(requireCodecs(), exports$1);
		__exportStar(requireCommon(), exports$1);
		__exportStar(requireDeferred(), exports$1);
		__exportStar(requireErrors(), exports$1);
		__exportStar(requireFrames(), exports$1);
		__exportStar(requireRSocket(), exports$1);
		__exportStar(requireRSocketConnector(), exports$1);
		__exportStar(requireRSocketServer(), exports$1);
		__exportStar(requireTransport(), exports$1);
		
	} (dist));
	return dist;
}

var distExports = requireDist();

var version = "1.45.0";
var PACKAGE = {
	version: version};

const DEFAULT_PRESSURE_LIMITS = {
    highWater: 10,
    lowWater: 0
};
/**
 * A very basic implementation of a data stream with backpressure support which does not use
 * native JS streams or async iterators.
 * This is handy for environments such as React Native which need polyfills for the above.
 */
class DataStream extends BaseObserver {
    options;
    dataQueue;
    isClosed;
    processingPromise;
    notifyDataAdded;
    logger;
    mapLine;
    constructor(options) {
        super();
        this.options = options;
        this.processingPromise = null;
        this.isClosed = false;
        this.dataQueue = [];
        this.mapLine = options?.mapLine ?? ((line) => line);
        this.logger = options?.logger ?? Logger.get('DataStream');
        if (options?.closeOnError) {
            const l = this.registerListener({
                error: (ex) => {
                    l?.();
                    this.close();
                }
            });
        }
    }
    get highWatermark() {
        return this.options?.pressure?.highWaterMark ?? DEFAULT_PRESSURE_LIMITS.highWater;
    }
    get lowWatermark() {
        return this.options?.pressure?.lowWaterMark ?? DEFAULT_PRESSURE_LIMITS.lowWater;
    }
    get closed() {
        return this.isClosed;
    }
    async close() {
        this.isClosed = true;
        await this.processingPromise;
        this.iterateListeners((l) => l.closed?.());
        // Discard any data in the queue
        this.dataQueue = [];
        this.listeners.clear();
    }
    /**
     * Enqueues data for the consumers to read
     */
    enqueueData(data) {
        if (this.isClosed) {
            throw new Error('Cannot enqueue data into closed stream.');
        }
        this.dataQueue.push(data);
        this.notifyDataAdded?.();
        this.processQueue();
    }
    /**
     * Reads data once from the data stream
     * @returns a Data payload or Null if the stream closed.
     */
    async read() {
        if (this.closed) {
            return null;
        }
        return new Promise((resolve, reject) => {
            const l = this.registerListener({
                data: async (data) => {
                    resolve(data);
                    // Remove the listener
                    l?.();
                },
                closed: () => {
                    resolve(null);
                    l?.();
                },
                error: (ex) => {
                    reject(ex);
                    l?.();
                }
            });
            this.processQueue();
        });
    }
    /**
     * Executes a callback for each data item in the stream
     */
    forEach(callback) {
        if (this.dataQueue.length <= this.lowWatermark) {
            this.iterateAsyncErrored(async (l) => l.lowWater?.());
        }
        return this.registerListener({
            data: callback
        });
    }
    processQueue() {
        if (this.processingPromise) {
            return;
        }
        const promise = (this.processingPromise = this._processQueue());
        promise.finally(() => {
            return (this.processingPromise = null);
        });
        return promise;
    }
    hasDataReader() {
        return Array.from(this.listeners.values()).some((l) => !!l.data);
    }
    async _processQueue() {
        /**
         * Allow listeners to mutate the queue before processing.
         * This allows for operations such as dropping or compressing data
         * on high water or requesting more data on low water.
         */
        if (this.dataQueue.length >= this.highWatermark) {
            await this.iterateAsyncErrored(async (l) => l.highWater?.());
        }
        if (this.isClosed || !this.hasDataReader()) {
            return;
        }
        if (this.dataQueue.length) {
            const data = this.dataQueue.shift();
            const mapped = this.mapLine(data);
            await this.iterateAsyncErrored(async (l) => l.data?.(mapped));
        }
        if (this.dataQueue.length <= this.lowWatermark) {
            const dataAdded = new Promise((resolve) => {
                this.notifyDataAdded = resolve;
            });
            await Promise.race([this.iterateAsyncErrored(async (l) => l.lowWater?.()), dataAdded]);
            this.notifyDataAdded = null;
        }
        if (this.dataQueue.length > 0) {
            // Next tick
            setTimeout(() => this.processQueue());
        }
    }
    async iterateAsyncErrored(cb) {
        // Important: We need to copy the listeners, as calling a listener could result in adding another
        // listener, resulting in infinite loops.
        const listeners = Array.from(this.listeners.values());
        for (let i of listeners) {
            try {
                await cb(i);
            }
            catch (ex) {
                this.logger.error(ex);
                this.iterateListeners((l) => l.error?.(ex));
            }
        }
    }
}

var WebsocketDuplexConnection = {};

var hasRequiredWebsocketDuplexConnection;

function requireWebsocketDuplexConnection () {
	if (hasRequiredWebsocketDuplexConnection) return WebsocketDuplexConnection;
	hasRequiredWebsocketDuplexConnection = 1;
	/*
	 * Copyright 2021-2022 the original author or authors.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */
	var __extends = (WebsocketDuplexConnection && WebsocketDuplexConnection.__extends) || (function () {
	    var extendStatics = function (d, b) {
	        extendStatics = Object.setPrototypeOf ||
	            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
	            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
	        return extendStatics(d, b);
	    };
	    return function (d, b) {
	        if (typeof b !== "function" && b !== null)
	            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
	        extendStatics(d, b);
	        function __() { this.constructor = d; }
	        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	    };
	})();
	Object.defineProperty(WebsocketDuplexConnection, "__esModule", { value: true });
	WebsocketDuplexConnection.WebsocketDuplexConnection = void 0;
	var rsocket_core_1 = requireDist();
	var WebsocketDuplexConnection$1 = /** @class */ (function (_super) {
	    __extends(WebsocketDuplexConnection, _super);
	    function WebsocketDuplexConnection(websocket, deserializer, multiplexerDemultiplexerFactory) {
	        var _this = _super.call(this) || this;
	        _this.websocket = websocket;
	        _this.deserializer = deserializer;
	        _this.handleClosed = function (e) {
	            _this.close(new Error(e.reason || "WebsocketDuplexConnection: Socket closed unexpectedly."));
	        };
	        _this.handleError = function (e) {
	            _this.close(e.error);
	        };
	        _this.handleMessage = function (message) {
	            try {
	                var buffer = bufferExports.Buffer.from(message.data);
	                var frame = _this.deserializer.deserializeFrame(buffer);
	                _this.multiplexerDemultiplexer.handle(frame);
	            }
	            catch (error) {
	                _this.close(error);
	            }
	        };
	        websocket.addEventListener("close", _this.handleClosed);
	        websocket.addEventListener("error", _this.handleError);
	        websocket.addEventListener("message", _this.handleMessage);
	        _this.multiplexerDemultiplexer = multiplexerDemultiplexerFactory(_this);
	        return _this;
	    }
	    Object.defineProperty(WebsocketDuplexConnection.prototype, "availability", {
	        get: function () {
	            return this.done ? 0 : 1;
	        },
	        enumerable: false,
	        configurable: true
	    });
	    WebsocketDuplexConnection.prototype.close = function (error) {
	        if (this.done) {
	            _super.prototype.close.call(this, error);
	            return;
	        }
	        this.websocket.removeEventListener("close", this.handleClosed);
	        this.websocket.removeEventListener("error", this.handleError);
	        this.websocket.removeEventListener("message", this.handleMessage);
	        this.websocket.close();
	        delete this.websocket;
	        _super.prototype.close.call(this, error);
	    };
	    WebsocketDuplexConnection.prototype.send = function (frame) {
	        if (this.done) {
	            return;
	        }
	        var buffer = (0, rsocket_core_1.serializeFrame)(frame);
	        this.websocket.send(buffer);
	    };
	    return WebsocketDuplexConnection;
	}(rsocket_core_1.Deferred));
	WebsocketDuplexConnection.WebsocketDuplexConnection = WebsocketDuplexConnection$1;
	
	return WebsocketDuplexConnection;
}

var WebsocketDuplexConnectionExports = requireWebsocketDuplexConnection();

/**
 * Adapted from rsocket-websocket-client
 * https://github.com/rsocket/rsocket-js/blob/e224cf379e747c4f1ddc4f2fa111854626cc8575/packages/rsocket-websocket-client/src/WebsocketClientTransport.ts#L17
 * This adds additional error handling for React Native iOS.
 * This particularly adds a close listener to handle cases where the WebSocket
 * connection closes immediately after opening without emitting an error.
 */
class WebsocketClientTransport {
    url;
    factory;
    constructor(options) {
        this.url = options.url;
        this.factory = options.wsCreator ?? ((url) => new WebSocket(url));
    }
    connect(multiplexerDemultiplexerFactory) {
        return new Promise((resolve, reject) => {
            const websocket = this.factory(this.url);
            websocket.binaryType = 'arraybuffer';
            let removeListeners;
            const openListener = () => {
                removeListeners();
                resolve(new WebsocketDuplexConnectionExports.WebsocketDuplexConnection(websocket, new distExports.Deserializer(), multiplexerDemultiplexerFactory));
            };
            const errorListener = (ev) => {
                removeListeners();
                // We add a default error in that case.
                if (ev.error != null) {
                    // undici typically provides an error object
                    reject(ev.error);
                }
                else if (ev.message != null) {
                    // React Native typically does not provide an error object, but does provide a message
                    reject(new Error(`Failed to create websocket connection: ${ev.message}`));
                }
                else {
                    // Browsers often provide no details at all
                    reject(new Error(`Failed to create websocket connection to ${this.url}`));
                }
            };
            /**
             * In some cases, such as React Native iOS, the WebSocket connection may close immediately after opening
             * without and error. In such cases, we need to handle the close event to reject the promise.
             */
            const closeListener = () => {
                removeListeners();
                reject(new Error('WebSocket connection closed while opening'));
            };
            removeListeners = () => {
                websocket.removeEventListener('open', openListener);
                websocket.removeEventListener('error', errorListener);
                websocket.removeEventListener('close', closeListener);
            };
            websocket.addEventListener('open', openListener);
            websocket.addEventListener('error', errorListener);
            websocket.addEventListener('close', closeListener);
        });
    }
}

const POWERSYNC_TRAILING_SLASH_MATCH = /\/+$/;
const POWERSYNC_JS_VERSION = PACKAGE.version;
const SYNC_QUEUE_REQUEST_LOW_WATER = 5;
// Keep alive message is sent every period
const KEEP_ALIVE_MS = 20_000;
// One message of any type must be received in this period.
const SOCKET_TIMEOUT_MS = 30_000;
// One keepalive message must be received in this period.
// If there is a backlog of messages (for example on slow connections), keepalive messages could be delayed
// significantly. Therefore this is longer than the socket timeout.
const KEEP_ALIVE_LIFETIME_MS = 90_000;
const DEFAULT_REMOTE_LOGGER = Logger.get('PowerSyncRemote');
var FetchStrategy;
(function (FetchStrategy) {
    /**
     * Queues multiple sync events before processing, reducing round-trips.
     * This comes at the cost of more processing overhead, which may cause ACK timeouts on older/weaker devices for big enough datasets.
     */
    FetchStrategy["Buffered"] = "buffered";
    /**
     * Processes each sync event immediately before requesting the next.
     * This reduces processing overhead and improves real-time responsiveness.
     */
    FetchStrategy["Sequential"] = "sequential";
})(FetchStrategy || (FetchStrategy = {}));
/**
 * Class wrapper for providing a fetch implementation.
 * The class wrapper is used to distinguish the fetchImplementation
 * option in [AbstractRemoteOptions] from the general fetch method
 * which is typeof "function"
 */
class FetchImplementationProvider {
    getFetch() {
        throw new Error('Unspecified fetch implementation');
    }
}
const DEFAULT_REMOTE_OPTIONS = {
    socketUrlTransformer: (url) => url.replace(/^https?:\/\//, function (match) {
        return match === 'https://' ? 'wss://' : 'ws://';
    }),
    fetchImplementation: new FetchImplementationProvider(),
    fetchOptions: {}
};
class AbstractRemote {
    connector;
    logger;
    credentials = null;
    options;
    constructor(connector, logger = DEFAULT_REMOTE_LOGGER, options) {
        this.connector = connector;
        this.logger = logger;
        this.options = {
            ...DEFAULT_REMOTE_OPTIONS,
            ...(options ?? {})
        };
    }
    /**
     * @returns a fetch implementation (function)
     * which can be called to perform fetch requests
     */
    get fetch() {
        const { fetchImplementation } = this.options;
        return fetchImplementation instanceof FetchImplementationProvider
            ? fetchImplementation.getFetch()
            : fetchImplementation;
    }
    /**
     * Get credentials currently cached, or fetch new credentials if none are
     * available.
     *
     * These credentials may have expired already.
     */
    async getCredentials() {
        if (this.credentials) {
            return this.credentials;
        }
        return this.prefetchCredentials();
    }
    /**
     * Fetch a new set of credentials and cache it.
     *
     * Until this call succeeds, `getCredentials` will still return the
     * old credentials.
     *
     * This may be called before the current credentials have expired.
     */
    async prefetchCredentials() {
        this.credentials = await this.fetchCredentials();
        return this.credentials;
    }
    /**
     * Get credentials for PowerSync.
     *
     * This should always fetch a fresh set of credentials - don't use cached
     * values.
     */
    async fetchCredentials() {
        const credentials = await this.connector.fetchCredentials();
        if (credentials?.endpoint.match(POWERSYNC_TRAILING_SLASH_MATCH)) {
            throw new Error(`A trailing forward slash "/" was found in the fetchCredentials endpoint: "${credentials.endpoint}". Remove the trailing forward slash "/" to fix this error.`);
        }
        return credentials;
    }
    /***
     * Immediately invalidate credentials.
     *
     * This may be called when the current credentials have expired.
     */
    invalidateCredentials() {
        this.credentials = null;
        this.connector.invalidateCredentials?.();
    }
    getUserAgent() {
        return `powersync-js/${POWERSYNC_JS_VERSION}`;
    }
    async buildRequest(path) {
        const credentials = await this.getCredentials();
        if (credentials != null && (credentials.endpoint == null || credentials.endpoint == '')) {
            throw new Error('PowerSync endpoint not configured');
        }
        else if (credentials?.token == null || credentials?.token == '') {
            const error = new Error(`Not signed in`);
            error.status = 401;
            throw error;
        }
        const userAgent = this.getUserAgent();
        return {
            url: credentials.endpoint + path,
            headers: {
                'content-type': 'application/json',
                Authorization: `Token ${credentials.token}`,
                'x-user-agent': userAgent
            }
        };
    }
    async post(path, data, headers = {}) {
        const request = await this.buildRequest(path);
        const res = await this.fetch(request.url, {
            method: 'POST',
            headers: {
                ...headers,
                ...request.headers
            },
            body: JSON.stringify(data)
        });
        if (res.status === 401) {
            this.invalidateCredentials();
        }
        if (!res.ok) {
            throw new Error(`Received ${res.status} - ${res.statusText} when posting to ${path}: ${await res.text()}}`);
        }
        return res.json();
    }
    async get(path, headers) {
        const request = await this.buildRequest(path);
        const res = await this.fetch(request.url, {
            method: 'GET',
            headers: {
                ...headers,
                ...request.headers
            }
        });
        if (res.status === 401) {
            this.invalidateCredentials();
        }
        if (!res.ok) {
            throw new Error(`Received ${res.status} - ${res.statusText} when getting from ${path}: ${await res.text()}}`);
        }
        return res.json();
    }
    /**
     * @returns A text decoder decoding UTF-8. This is a method to allow patching it for Hermes which doesn't support the
     * builtin, without forcing us to bundle a polyfill with `@powersync/common`.
     */
    createTextDecoder() {
        return new TextDecoder();
    }
    createSocket(url) {
        return new WebSocket(url);
    }
    /**
     * Returns a data stream of sync line data.
     *
     * @param map Maps received payload frames to the typed event value.
     * @param bson A BSON encoder and decoder. When set, the data stream will be requested with a BSON payload
     * (required for compatibility with older sync services).
     */
    async socketStreamRaw(options, map, bson) {
        const { path, fetchStrategy = FetchStrategy.Buffered } = options;
        const mimeType = bson == null ? 'application/json' : 'application/bson';
        function toBuffer(js) {
            let contents;
            if (bson != null) {
                contents = bson.serialize(js);
            }
            else {
                contents = JSON.stringify(js);
            }
            return bufferExports$1.Buffer.from(contents);
        }
        const syncQueueRequestSize = fetchStrategy == FetchStrategy.Buffered ? 10 : 1;
        const request = await this.buildRequest(path);
        // Add the user agent in the setup payload - we can't set custom
        // headers with websockets on web. The browser userAgent is however added
        // automatically as a header.
        const userAgent = this.getUserAgent();
        const stream = new DataStream({
            logger: this.logger,
            pressure: {
                lowWaterMark: SYNC_QUEUE_REQUEST_LOW_WATER
            },
            mapLine: map
        });
        // Handle upstream abort
        if (options.abortSignal?.aborted) {
            throw new AbortOperation('Connection request aborted');
        }
        else {
            options.abortSignal?.addEventListener('abort', () => {
                stream.close();
            }, { once: true });
        }
        let keepAliveTimeout;
        const resetTimeout = () => {
            clearTimeout(keepAliveTimeout);
            keepAliveTimeout = setTimeout(() => {
                this.logger.error(`No data received on WebSocket in ${SOCKET_TIMEOUT_MS}ms, closing connection.`);
                stream.close();
            }, SOCKET_TIMEOUT_MS);
        };
        resetTimeout();
        // Typescript complains about this being `never` if it's not assigned here.
        // This is assigned in `wsCreator`.
        let disposeSocketConnectionTimeout = () => { };
        const url = this.options.socketUrlTransformer(request.url);
        const connector = new distExports.RSocketConnector({
            transport: new WebsocketClientTransport({
                url,
                wsCreator: (url) => {
                    const socket = this.createSocket(url);
                    disposeSocketConnectionTimeout = stream.registerListener({
                        closed: () => {
                            // Allow closing the underlying WebSocket if the stream was closed before the
                            // RSocket connect completed. This should effectively abort the request.
                            socket.close();
                        }
                    });
                    socket.addEventListener('message', (event) => {
                        resetTimeout();
                    });
                    return socket;
                }
            }),
            setup: {
                keepAlive: KEEP_ALIVE_MS,
                lifetime: KEEP_ALIVE_LIFETIME_MS,
                dataMimeType: mimeType,
                metadataMimeType: mimeType,
                payload: {
                    data: null,
                    metadata: toBuffer({
                        token: request.headers.Authorization,
                        user_agent: userAgent
                    })
                }
            }
        });
        let rsocket;
        try {
            rsocket = await connector.connect();
            // The connection is established, we no longer need to monitor the initial timeout
            disposeSocketConnectionTimeout();
        }
        catch (ex) {
            this.logger.error(`Failed to connect WebSocket`, ex);
            clearTimeout(keepAliveTimeout);
            if (!stream.closed) {
                await stream.close();
            }
            throw ex;
        }
        resetTimeout();
        let socketIsClosed = false;
        const closeSocket = () => {
            clearTimeout(keepAliveTimeout);
            if (socketIsClosed) {
                return;
            }
            socketIsClosed = true;
            rsocket.close();
        };
        // Helps to prevent double close scenarios
        rsocket.onClose(() => (socketIsClosed = true));
        // We initially request this amount and expect these to arrive eventually
        let pendingEventsCount = syncQueueRequestSize;
        const disposeClosedListener = stream.registerListener({
            closed: () => {
                closeSocket();
                disposeClosedListener();
            }
        });
        const socket = await new Promise((resolve, reject) => {
            let connectionEstablished = false;
            const res = rsocket.requestStream({
                data: toBuffer(options.data),
                metadata: toBuffer({
                    path
                })
            }, syncQueueRequestSize, // The initial N amount
            {
                onError: (e) => {
                    if (e.message.includes('PSYNC_')) {
                        if (e.message.includes('PSYNC_S21')) {
                            this.invalidateCredentials();
                        }
                    }
                    else {
                        // Possible that connection is with an older service, always invalidate to be safe
                        if (e.message !== 'Closed. ') {
                            this.invalidateCredentials();
                        }
                    }
                    // Don't log closed as an error
                    if (e.message !== 'Closed. ') {
                        this.logger.error(e);
                    }
                    // RSocket will close the RSocket stream automatically
                    // Close the downstream stream as well - this will close the RSocket connection and WebSocket
                    stream.close();
                    // Handles cases where the connection failed e.g. auth error or connection error
                    if (!connectionEstablished) {
                        reject(e);
                    }
                },
                onNext: (payload) => {
                    // The connection is active
                    if (!connectionEstablished) {
                        connectionEstablished = true;
                        resolve(res);
                    }
                    const { data } = payload;
                    // Less events are now pending
                    pendingEventsCount--;
                    if (!data) {
                        return;
                    }
                    stream.enqueueData(data);
                },
                onComplete: () => {
                    stream.close();
                },
                onExtension: () => { }
            });
        });
        const l = stream.registerListener({
            lowWater: async () => {
                // Request to fill up the queue
                const required = syncQueueRequestSize - pendingEventsCount;
                if (required > 0) {
                    socket.request(syncQueueRequestSize - pendingEventsCount);
                    pendingEventsCount = syncQueueRequestSize;
                }
            },
            closed: () => {
                l();
            }
        });
        return stream;
    }
    /**
     * Connects to the sync/stream http endpoint, mapping and emitting each received string line.
     */
    async postStreamRaw(options, mapLine) {
        const { data, path, headers, abortSignal } = options;
        const request = await this.buildRequest(path);
        /**
         * This abort controller will abort pending fetch requests.
         * If the request has resolved, it will be used to close the readable stream.
         * Which will cancel the network request.
         *
         * This nested controller is required since:
         *  Aborting the active fetch request while it is being consumed seems to throw
         *  an unhandled exception on the window level.
         */
        if (abortSignal?.aborted) {
            throw new AbortOperation('Abort request received before making postStreamRaw request');
        }
        const controller = new AbortController();
        let requestResolved = false;
        abortSignal?.addEventListener('abort', () => {
            if (!requestResolved) {
                // Only abort via the abort controller if the request has not resolved yet
                controller.abort(abortSignal.reason ??
                    new AbortOperation('Cancelling network request before it resolves. Abort signal has been received.'));
            }
        });
        const res = await this.fetch(request.url, {
            method: 'POST',
            headers: { ...headers, ...request.headers },
            body: JSON.stringify(data),
            signal: controller.signal,
            cache: 'no-store',
            ...(this.options.fetchOptions ?? {}),
            ...options.fetchOptions
        }).catch((ex) => {
            if (ex.name == 'AbortError') {
                throw new AbortOperation(`Pending fetch request to ${request.url} has been aborted.`);
            }
            throw ex;
        });
        if (!res) {
            throw new Error('Fetch request was aborted');
        }
        requestResolved = true;
        if (!res.ok || !res.body) {
            const text = await res.text();
            this.logger.error(`Could not POST streaming to ${path} - ${res.status} - ${res.statusText}: ${text}`);
            const error = new Error(`HTTP ${res.statusText}: ${text}`);
            error.status = res.status;
            throw error;
        }
        // Create a new stream splitting the response at line endings while also handling cancellations
        // by closing the reader.
        const reader = res.body.getReader();
        let readerReleased = false;
        // This will close the network request and read stream
        const closeReader = async () => {
            try {
                readerReleased = true;
                await reader.cancel();
            }
            catch (ex) {
                // an error will throw if the reader hasn't been used yet
            }
            reader.releaseLock();
        };
        const stream = new DataStream({
            logger: this.logger,
            mapLine: mapLine
        });
        abortSignal?.addEventListener('abort', () => {
            closeReader();
            stream.close();
        });
        const decoder = this.createTextDecoder();
        let buffer = '';
        const l = stream.registerListener({
            lowWater: async () => {
                if (stream.closed || abortSignal?.aborted || readerReleased) {
                    return;
                }
                try {
                    let didCompleteLine = false;
                    while (!didCompleteLine) {
                        const { done, value } = await reader.read();
                        if (done) {
                            const remaining = buffer.trim();
                            if (remaining.length != 0) {
                                stream.enqueueData(remaining);
                            }
                            stream.close();
                            await closeReader();
                            return;
                        }
                        const data = decoder.decode(value, { stream: true });
                        buffer += data;
                        const lines = buffer.split('\n');
                        for (var i = 0; i < lines.length - 1; i++) {
                            var l = lines[i].trim();
                            if (l.length > 0) {
                                stream.enqueueData(l);
                                didCompleteLine = true;
                            }
                        }
                        buffer = lines[lines.length - 1];
                    }
                }
                catch (ex) {
                    stream.close();
                    throw ex;
                }
            },
            closed: () => {
                closeReader();
                l?.();
            }
        });
        return stream;
    }
}

function priorityToJs(status) {
    return {
        priority: status.priority,
        hasSynced: status.has_synced ?? undefined,
        lastSyncedAt: status.last_synced_at != null ? new Date(status.last_synced_at * 1000) : undefined
    };
}
function coreStatusToJs(status) {
    const coreCompleteSync = status.priority_status.find((s) => s.priority == FULL_SYNC_PRIORITY);
    const completeSync = coreCompleteSync != null ? priorityToJs(coreCompleteSync) : null;
    return {
        connected: status.connected,
        connecting: status.connecting,
        dataFlow: {
            // We expose downloading as a boolean field, the core extension reports download information as a nullable
            // download status. When that status is non-null, a download is in progress.
            downloading: status.downloading != null,
            downloadProgress: status.downloading?.buckets,
            internalStreamSubscriptions: status.streams
        },
        lastSyncedAt: completeSync?.lastSyncedAt,
        hasSynced: completeSync?.hasSynced,
        priorityStatusEntries: status.priority_status.map(priorityToJs)
    };
}

function isStreamingSyncData(line) {
    return line.data != null;
}
function isStreamingKeepalive(line) {
    return line.token_expires_in != null;
}
function isStreamingSyncCheckpoint(line) {
    return line.checkpoint != null;
}
function isStreamingSyncCheckpointComplete(line) {
    return line.checkpoint_complete != null;
}
function isStreamingSyncCheckpointPartiallyComplete(line) {
    return line.partial_checkpoint_complete != null;
}
function isStreamingSyncCheckpointDiff(line) {
    return line.checkpoint_diff != null;
}
function isContinueCheckpointRequest(request) {
    return (Array.isArray(request.buckets) &&
        typeof request.checkpoint_token == 'string');
}
function isSyncNewCheckpointRequest(request) {
    return typeof request.request_checkpoint == 'object';
}

var LockType;
(function (LockType) {
    LockType["CRUD"] = "crud";
    LockType["SYNC"] = "sync";
})(LockType || (LockType = {}));
var SyncStreamConnectionMethod;
(function (SyncStreamConnectionMethod) {
    SyncStreamConnectionMethod["HTTP"] = "http";
    SyncStreamConnectionMethod["WEB_SOCKET"] = "web-socket";
})(SyncStreamConnectionMethod || (SyncStreamConnectionMethod = {}));
var SyncClientImplementation;
(function (SyncClientImplementation) {
    /**
     * Decodes and handles sync lines received from the sync service in JavaScript.
     *
     * This is the default option.
     *
     * @deprecated Don't use {@link SyncClientImplementation.JAVASCRIPT} directly. Instead, use
     * {@link DEFAULT_SYNC_CLIENT_IMPLEMENTATION} or omit the option. The explicit choice to use
     * the JavaScript-based sync implementation will be removed from a future version of the SDK.
     */
    SyncClientImplementation["JAVASCRIPT"] = "js";
    /**
     * This implementation offloads the sync line decoding and handling into the PowerSync
     * core extension.
     *
     * @experimental
     * While this implementation is more performant than {@link SyncClientImplementation.JAVASCRIPT},
     * it has seen less real-world testing and is marked as __experimental__ at the moment.
     *
     * ## Compatibility warning
     *
     * The Rust sync client stores sync data in a format that is slightly different than the one used
     * by the old {@link JAVASCRIPT} implementation. When adopting the {@link RUST} client on existing
     * databases, the PowerSync SDK will migrate the format automatically.
     * Further, the {@link JAVASCRIPT} client in recent versions of the PowerSync JS SDK (starting from
     * the version introducing {@link RUST} as an option) also supports the new format, so you can switch
     * back to {@link JAVASCRIPT} later.
     *
     * __However__: Upgrading the SDK version, then adopting {@link RUST} as a sync client and later
     * downgrading the SDK to an older version (necessarily using the JavaScript-based implementation then)
     * can lead to sync issues.
     */
    SyncClientImplementation["RUST"] = "rust";
})(SyncClientImplementation || (SyncClientImplementation = {}));
/**
 * The default {@link SyncClientImplementation} to use.
 *
 * Please use this field instead of {@link SyncClientImplementation.JAVASCRIPT} directly. A future version
 * of the PowerSync SDK will enable {@link SyncClientImplementation.RUST} by default and remove the JavaScript
 * option.
 */
const DEFAULT_SYNC_CLIENT_IMPLEMENTATION = SyncClientImplementation.JAVASCRIPT;
const DEFAULT_CRUD_UPLOAD_THROTTLE_MS = 1000;
const DEFAULT_RETRY_DELAY_MS = 5000;
const DEFAULT_STREAMING_SYNC_OPTIONS = {
    retryDelayMs: DEFAULT_RETRY_DELAY_MS,
    crudUploadThrottleMs: DEFAULT_CRUD_UPLOAD_THROTTLE_MS
};
const DEFAULT_STREAM_CONNECTION_OPTIONS = {
    appMetadata: {},
    connectionMethod: SyncStreamConnectionMethod.WEB_SOCKET,
    clientImplementation: DEFAULT_SYNC_CLIENT_IMPLEMENTATION,
    fetchStrategy: FetchStrategy.Buffered,
    params: {},
    serializedSchema: undefined,
    includeDefaultStreams: true
};
// The priority we assume when we receive checkpoint lines where no priority is set.
// This is the default priority used by the sync service, but can be set to an arbitrary
// value since sync services without priorities also won't send partial sync completion
// messages.
const FALLBACK_PRIORITY = 3;
class AbstractStreamingSyncImplementation extends BaseObserver {
    _lastSyncedAt;
    options;
    abortController;
    // In rare cases, mostly for tests, uploads can be triggered without being properly connected.
    // This allows ensuring that all upload processes can be aborted.
    uploadAbortController;
    crudUpdateListener;
    streamingSyncPromise;
    logger;
    activeStreams;
    isUploadingCrud = false;
    notifyCompletedUploads;
    handleActiveStreamsChange;
    syncStatus;
    triggerCrudUpload;
    constructor(options) {
        super();
        this.options = options;
        this.activeStreams = options.subscriptions;
        this.logger = options.logger ?? Logger.get('PowerSyncStream');
        this.syncStatus = new SyncStatus({
            connected: false,
            connecting: false,
            lastSyncedAt: undefined,
            dataFlow: {
                uploading: false,
                downloading: false
            }
        });
        this.abortController = null;
        this.triggerCrudUpload = throttleLeadingTrailing(() => {
            if (!this.syncStatus.connected || this.isUploadingCrud) {
                return;
            }
            this.isUploadingCrud = true;
            this._uploadAllCrud().finally(() => {
                this.notifyCompletedUploads?.();
                this.isUploadingCrud = false;
            });
        }, this.options.crudUploadThrottleMs);
    }
    async waitForReady() { }
    waitForStatus(status) {
        return this.waitUntilStatusMatches((currentStatus) => {
            /**
             * Match only the partial status options provided in the
             * matching status
             */
            const matchPartialObject = (compA, compB) => {
                return Object.entries(compA).every(([key, value]) => {
                    const comparisonBValue = compB[key];
                    if (typeof value == 'object' && typeof comparisonBValue == 'object') {
                        return matchPartialObject(value, comparisonBValue);
                    }
                    return value == comparisonBValue;
                });
            };
            return matchPartialObject(status, currentStatus);
        });
    }
    waitUntilStatusMatches(predicate) {
        return new Promise((resolve) => {
            if (predicate(this.syncStatus)) {
                resolve();
                return;
            }
            const l = this.registerListener({
                statusChanged: (updatedStatus) => {
                    if (predicate(updatedStatus)) {
                        resolve();
                        l?.();
                    }
                }
            });
        });
    }
    get lastSyncedAt() {
        const lastSynced = this.syncStatus.lastSyncedAt;
        return lastSynced && new Date(lastSynced);
    }
    get isConnected() {
        return this.syncStatus.connected;
    }
    async dispose() {
        super.dispose();
        this.crudUpdateListener?.();
        this.crudUpdateListener = undefined;
        this.uploadAbortController?.abort();
    }
    async hasCompletedSync() {
        return this.options.adapter.hasCompletedSync();
    }
    async getWriteCheckpoint() {
        const clientId = await this.options.adapter.getClientId();
        let path = `/write-checkpoint2.json?client_id=${clientId}`;
        const response = await this.options.remote.get(path);
        const checkpoint = response['data']['write_checkpoint'];
        this.logger.debug(`Created write checkpoint: ${checkpoint}`);
        return checkpoint;
    }
    async _uploadAllCrud() {
        return this.obtainLock({
            type: LockType.CRUD,
            callback: async () => {
                /**
                 * Keep track of the first item in the CRUD queue for the last `uploadCrud` iteration.
                 */
                let checkedCrudItem;
                const controller = new AbortController();
                this.uploadAbortController = controller;
                this.abortController?.signal.addEventListener('abort', () => {
                    controller.abort();
                }, { once: true });
                while (!controller.signal.aborted) {
                    try {
                        /**
                         * This is the first item in the FIFO CRUD queue.
                         */
                        const nextCrudItem = await this.options.adapter.nextCrudItem();
                        if (nextCrudItem) {
                            this.updateSyncStatus({
                                dataFlow: {
                                    uploading: true
                                }
                            });
                            if (nextCrudItem.clientId == checkedCrudItem?.clientId) {
                                // This will force a higher log level than exceptions which are caught here.
                                this.logger.warn(`Potentially previously uploaded CRUD entries are still present in the upload queue.
Make sure to handle uploads and complete CRUD transactions or batches by calling and awaiting their [.complete()] method.
The next upload iteration will be delayed.`);
                                throw new Error('Delaying due to previously encountered CRUD item.');
                            }
                            checkedCrudItem = nextCrudItem;
                            await this.options.uploadCrud();
                            this.updateSyncStatus({
                                dataFlow: {
                                    uploadError: undefined
                                }
                            });
                        }
                        else {
                            // Uploading is completed
                            const neededUpdate = await this.options.adapter.updateLocalTarget(() => this.getWriteCheckpoint());
                            if (neededUpdate == false && checkedCrudItem != null) {
                                // Only log this if there was something to upload
                                this.logger.debug('Upload complete, no write checkpoint needed.');
                            }
                            break;
                        }
                    }
                    catch (ex) {
                        checkedCrudItem = undefined;
                        this.updateSyncStatus({
                            dataFlow: {
                                uploading: false,
                                uploadError: ex
                            }
                        });
                        await this.delayRetry(controller.signal);
                        if (!this.isConnected) {
                            // Exit the upload loop if the sync stream is no longer connected
                            break;
                        }
                        this.logger.debug(`Caught exception when uploading. Upload will retry after a delay. Exception: ${ex.message}`);
                    }
                    finally {
                        this.updateSyncStatus({
                            dataFlow: {
                                uploading: false
                            }
                        });
                    }
                }
                this.uploadAbortController = null;
            }
        });
    }
    async connect(options) {
        if (this.abortController) {
            await this.disconnect();
        }
        const controller = new AbortController();
        this.abortController = controller;
        this.streamingSyncPromise = this.streamingSync(this.abortController.signal, options);
        // Return a promise that resolves when the connection status is updated to indicate that we're connected.
        return new Promise((resolve) => {
            const disposer = this.registerListener({
                statusChanged: (status) => {
                    if (status.dataFlowStatus.downloadError != null) {
                        this.logger.warn('Initial connect attempt did not successfully connect to server');
                    }
                    else if (status.connecting) {
                        // Still connecting.
                        return;
                    }
                    disposer();
                    resolve();
                }
            });
        });
    }
    async disconnect() {
        if (!this.abortController) {
            return;
        }
        // This might be called multiple times
        if (!this.abortController.signal.aborted) {
            this.abortController.abort(new AbortOperation('Disconnect has been requested'));
        }
        // Await any pending operations before completing the disconnect operation
        try {
            await this.streamingSyncPromise;
        }
        catch (ex) {
            // The operation might have failed, all we care about is if it has completed
            this.logger.warn(ex);
        }
        this.streamingSyncPromise = undefined;
        this.abortController = null;
        this.updateSyncStatus({ connected: false, connecting: false });
    }
    /**
     * @deprecated use [connect instead]
     */
    async streamingSync(signal, options) {
        if (!signal) {
            this.abortController = new AbortController();
            signal = this.abortController.signal;
        }
        /**
         * Listen for CRUD updates and trigger upstream uploads
         */
        this.crudUpdateListener = this.options.adapter.registerListener({
            crudUpdate: () => this.triggerCrudUpload()
        });
        /**
         * Create a new abort controller which aborts items downstream.
         * This is needed to close any previous connections on exception.
         */
        let nestedAbortController = new AbortController();
        signal.addEventListener('abort', () => {
            /**
             * A request for disconnect was received upstream. Relay the request
             * to the nested abort controller.
             */
            nestedAbortController.abort(signal?.reason ?? new AbortOperation('Received command to disconnect from upstream'));
            this.crudUpdateListener?.();
            this.crudUpdateListener = undefined;
            this.updateSyncStatus({
                connected: false,
                connecting: false,
                dataFlow: {
                    downloading: false,
                    downloadProgress: null
                }
            });
        });
        /**
         * This loops runs until [retry] is false or the abort signal is set to aborted.
         * Aborting the nestedAbortController will:
         *  - Abort any pending fetch requests
         *  - Close any sync stream ReadableStreams (which will also close any established network requests)
         */
        while (true) {
            this.updateSyncStatus({ connecting: true });
            let shouldDelayRetry = true;
            let result = null;
            try {
                if (signal?.aborted) {
                    break;
                }
                result = await this.streamingSyncIteration(nestedAbortController.signal, options);
                // Continue immediately, streamingSyncIteration will wait before completing if necessary.
            }
            catch (ex) {
                /**
                 * Either:
                 *  - A network request failed with a failed connection or not OKAY response code.
                 *  - There was a sync processing error.
                 *  - The connection was aborted.
                 * This loop will retry after a delay if the connection was not aborted.
                 * The nested abort controller will cleanup any open network requests and streams.
                 * The WebRemote should only abort pending fetch requests or close active Readable streams.
                 */
                if (ex instanceof AbortOperation) {
                    this.logger.warn(ex);
                    shouldDelayRetry = false;
                    // A disconnect was requested, we should not delay since there is no explicit retry
                }
                else {
                    this.logger.error(ex);
                }
                this.updateSyncStatus({
                    dataFlow: {
                        downloadError: ex
                    }
                });
            }
            finally {
                this.notifyCompletedUploads = undefined;
                if (!signal.aborted) {
                    nestedAbortController.abort(new AbortOperation('Closing sync stream network requests before retry.'));
                    nestedAbortController = new AbortController();
                }
                if (result?.immediateRestart != true) {
                    this.updateSyncStatus({
                        connected: false,
                        connecting: true // May be unnecessary
                    });
                    // On error, wait a little before retrying
                    if (shouldDelayRetry) {
                        await this.delayRetry(nestedAbortController.signal);
                    }
                }
            }
        }
        // Mark as disconnected if here
        this.updateSyncStatus({ connected: false, connecting: false });
    }
    async collectLocalBucketState() {
        const bucketEntries = await this.options.adapter.getBucketStates();
        const req = bucketEntries.map((entry) => ({
            name: entry.bucket,
            after: entry.op_id
        }));
        const localDescriptions = new Map();
        for (const entry of bucketEntries) {
            localDescriptions.set(entry.bucket, null);
        }
        return [req, localDescriptions];
    }
    /**
     * Older versions of the JS SDK used to encode subkeys as JSON in {@link OplogEntry.toJSON}.
     * Because subkeys are always strings, this leads to quotes being added around them in `ps_oplog`.
     * While this is not a problem as long as it's done consistently, it causes issues when a database
     * created by the JS SDK is used with other SDKs, or (more likely) when the new Rust sync client
     * is enabled.
     *
     * So, we add a migration from the old key format (with quotes) to the new one (no quotes). The
     * migration is only triggered when necessary (for now). The function returns whether the new format
     * should be used, so that the JS SDK is able to write to updated databases.
     *
     * @param requireFixedKeyFormat Whether we require the new format or also support the old one.
     *        The Rust client requires the new subkey format.
     * @returns Whether the database is now using the new, fixed subkey format.
     */
    async requireKeyFormat(requireFixedKeyFormat) {
        const hasMigrated = await this.options.adapter.hasMigratedSubkeys();
        if (requireFixedKeyFormat && !hasMigrated) {
            await this.options.adapter.migrateToFixedSubkeys();
            return true;
        }
        else {
            return hasMigrated;
        }
    }
    streamingSyncIteration(signal, options) {
        return this.obtainLock({
            type: LockType.SYNC,
            signal,
            callback: async () => {
                const resolvedOptions = {
                    ...DEFAULT_STREAM_CONNECTION_OPTIONS,
                    ...(options ?? {})
                };
                // Validate app metadata
                const invalidMetadata = Object.entries(resolvedOptions.appMetadata).filter(([_, value]) => typeof value != 'string');
                if (invalidMetadata.length > 0) {
                    throw new Error(`Invalid appMetadata provided. Only string values are allowed. Invalid values: ${invalidMetadata.map(([key, value]) => `${key}: ${value}`).join(', ')}`);
                }
                const clientImplementation = resolvedOptions.clientImplementation;
                this.updateSyncStatus({ clientImplementation });
                if (clientImplementation == SyncClientImplementation.JAVASCRIPT) {
                    await this.legacyStreamingSyncIteration(signal, resolvedOptions);
                    return null;
                }
                else {
                    await this.requireKeyFormat(true);
                    return await this.rustSyncIteration(signal, resolvedOptions);
                }
            }
        });
    }
    async legacyStreamingSyncIteration(signal, resolvedOptions) {
        const rawTables = resolvedOptions.serializedSchema?.raw_tables;
        if (rawTables != null && rawTables.length) {
            this.logger.warn('Raw tables require the Rust-based sync client. The JS client will ignore them.');
        }
        this.logger.debug('Streaming sync iteration started');
        this.options.adapter.startSession();
        let [req, bucketMap] = await this.collectLocalBucketState();
        let targetCheckpoint = null;
        // A checkpoint that has been validated but not applied (e.g. due to pending local writes)
        let pendingValidatedCheckpoint = null;
        const clientId = await this.options.adapter.getClientId();
        const usingFixedKeyFormat = await this.requireKeyFormat(false);
        this.logger.debug('Requesting stream from server');
        const syncOptions = {
            path: '/sync/stream',
            abortSignal: signal,
            data: {
                buckets: req,
                include_checksum: true,
                raw_data: true,
                parameters: resolvedOptions.params,
                app_metadata: resolvedOptions.appMetadata,
                client_id: clientId
            }
        };
        let stream;
        if (resolvedOptions?.connectionMethod == SyncStreamConnectionMethod.HTTP) {
            stream = await this.options.remote.postStreamRaw(syncOptions, (line) => {
                if (typeof line == 'string') {
                    return JSON.parse(line);
                }
                else {
                    // Directly enqueued by us
                    return line;
                }
            });
        }
        else {
            const bson = await this.options.remote.getBSON();
            stream = await this.options.remote.socketStreamRaw({
                ...syncOptions,
                ...{ fetchStrategy: resolvedOptions.fetchStrategy }
            }, (payload) => {
                if (payload instanceof Uint8Array) {
                    return bson.deserialize(payload);
                }
                else {
                    // Directly enqueued by us
                    return payload;
                }
            }, bson);
        }
        this.logger.debug('Stream established. Processing events');
        this.notifyCompletedUploads = () => {
            if (!stream.closed) {
                stream.enqueueData({ crud_upload_completed: null });
            }
        };
        while (!stream.closed) {
            const line = await stream.read();
            if (!line) {
                // The stream has closed while waiting
                return;
            }
            if ('crud_upload_completed' in line) {
                if (pendingValidatedCheckpoint != null) {
                    const { applied, endIteration } = await this.applyCheckpoint(pendingValidatedCheckpoint);
                    if (applied) {
                        pendingValidatedCheckpoint = null;
                    }
                    else if (endIteration) {
                        break;
                    }
                }
                continue;
            }
            // A connection is active and messages are being received
            if (!this.syncStatus.connected) {
                // There is a connection now
                Promise.resolve().then(() => this.triggerCrudUpload());
                this.updateSyncStatus({
                    connected: true
                });
            }
            if (isStreamingSyncCheckpoint(line)) {
                targetCheckpoint = line.checkpoint;
                // New checkpoint - existing validated checkpoint is no longer valid
                pendingValidatedCheckpoint = null;
                const bucketsToDelete = new Set(bucketMap.keys());
                const newBuckets = new Map();
                for (const checksum of line.checkpoint.buckets) {
                    newBuckets.set(checksum.bucket, {
                        name: checksum.bucket,
                        priority: checksum.priority ?? FALLBACK_PRIORITY
                    });
                    bucketsToDelete.delete(checksum.bucket);
                }
                if (bucketsToDelete.size > 0) {
                    this.logger.debug('Removing buckets', [...bucketsToDelete]);
                }
                bucketMap = newBuckets;
                await this.options.adapter.removeBuckets([...bucketsToDelete]);
                await this.options.adapter.setTargetCheckpoint(targetCheckpoint);
                await this.updateSyncStatusForStartingCheckpoint(targetCheckpoint);
            }
            else if (isStreamingSyncCheckpointComplete(line)) {
                const result = await this.applyCheckpoint(targetCheckpoint);
                if (result.endIteration) {
                    return;
                }
                else if (!result.applied) {
                    // "Could not apply checkpoint due to local data". We need to retry after
                    // finishing uploads.
                    pendingValidatedCheckpoint = targetCheckpoint;
                }
                else {
                    // Nothing to retry later. This would likely already be null from the last
                    // checksum or checksum_diff operation, but we make sure.
                    pendingValidatedCheckpoint = null;
                }
            }
            else if (isStreamingSyncCheckpointPartiallyComplete(line)) {
                const priority = line.partial_checkpoint_complete.priority;
                this.logger.debug('Partial checkpoint complete', priority);
                const result = await this.options.adapter.syncLocalDatabase(targetCheckpoint, priority);
                if (!result.checkpointValid) {
                    // This means checksums failed. Start again with a new checkpoint.
                    // TODO: better back-off
                    await new Promise((resolve) => setTimeout(resolve, 50));
                    return;
                }
                else if (!result.ready) ;
                else {
                    // We'll keep on downloading, but can report that this priority is synced now.
                    this.logger.debug('partial checkpoint validation succeeded');
                    // All states with a higher priority can be deleted since this partial sync includes them.
                    const priorityStates = this.syncStatus.priorityStatusEntries.filter((s) => s.priority <= priority);
                    priorityStates.push({
                        priority,
                        lastSyncedAt: new Date(),
                        hasSynced: true
                    });
                    this.updateSyncStatus({
                        connected: true,
                        priorityStatusEntries: priorityStates
                    });
                }
            }
            else if (isStreamingSyncCheckpointDiff(line)) {
                // TODO: It may be faster to just keep track of the diff, instead of the entire checkpoint
                if (targetCheckpoint == null) {
                    throw new Error('Checkpoint diff without previous checkpoint');
                }
                // New checkpoint - existing validated checkpoint is no longer valid
                pendingValidatedCheckpoint = null;
                const diff = line.checkpoint_diff;
                const newBuckets = new Map();
                for (const checksum of targetCheckpoint.buckets) {
                    newBuckets.set(checksum.bucket, checksum);
                }
                for (const checksum of diff.updated_buckets) {
                    newBuckets.set(checksum.bucket, checksum);
                }
                for (const bucket of diff.removed_buckets) {
                    newBuckets.delete(bucket);
                }
                const newCheckpoint = {
                    last_op_id: diff.last_op_id,
                    buckets: [...newBuckets.values()],
                    write_checkpoint: diff.write_checkpoint
                };
                targetCheckpoint = newCheckpoint;
                await this.updateSyncStatusForStartingCheckpoint(targetCheckpoint);
                bucketMap = new Map();
                newBuckets.forEach((checksum, name) => bucketMap.set(name, {
                    name: checksum.bucket,
                    priority: checksum.priority ?? FALLBACK_PRIORITY
                }));
                const bucketsToDelete = diff.removed_buckets;
                if (bucketsToDelete.length > 0) {
                    this.logger.debug('Remove buckets', bucketsToDelete);
                }
                await this.options.adapter.removeBuckets(bucketsToDelete);
                await this.options.adapter.setTargetCheckpoint(targetCheckpoint);
            }
            else if (isStreamingSyncData(line)) {
                const { data } = line;
                const previousProgress = this.syncStatus.dataFlowStatus.downloadProgress;
                let updatedProgress = null;
                if (previousProgress) {
                    updatedProgress = { ...previousProgress };
                    const progressForBucket = updatedProgress[data.bucket];
                    if (progressForBucket) {
                        updatedProgress[data.bucket] = {
                            ...progressForBucket,
                            since_last: progressForBucket.since_last + data.data.length
                        };
                    }
                }
                this.updateSyncStatus({
                    dataFlow: {
                        downloading: true,
                        downloadProgress: updatedProgress
                    }
                });
                await this.options.adapter.saveSyncData({ buckets: [SyncDataBucket.fromRow(data)] }, usingFixedKeyFormat);
            }
            else if (isStreamingKeepalive(line)) {
                const remaining_seconds = line.token_expires_in;
                if (remaining_seconds == 0) {
                    // Connection would be closed automatically right after this
                    this.logger.debug('Token expiring; reconnect');
                    /**
                     * For a rare case where the backend connector does not update the token
                     * (uses the same one), this should have some delay.
                     */
                    await this.delayRetry();
                    return;
                }
                else if (remaining_seconds < 30) {
                    this.logger.debug('Token will expire soon; reconnect');
                    // Pre-emptively refresh the token
                    this.options.remote.invalidateCredentials();
                    return;
                }
                this.triggerCrudUpload();
            }
            else {
                this.logger.debug('Received unknown sync line', line);
            }
        }
        this.logger.debug('Stream input empty');
        // Connection closed. Likely due to auth issue.
        return;
    }
    async rustSyncIteration(signal, resolvedOptions) {
        const syncImplementation = this;
        const adapter = this.options.adapter;
        const remote = this.options.remote;
        let receivingLines = null;
        let hadSyncLine = false;
        let hideDisconnectOnRestart = false;
        if (signal.aborted) {
            throw new AbortOperation('Connection request has been aborted');
        }
        const abortController = new AbortController();
        signal.addEventListener('abort', () => abortController.abort());
        // Pending sync lines received from the service, as well as local events that trigger a powersync_control
        // invocation (local events include refreshed tokens and completed uploads).
        // This is a single data stream so that we can handle all control calls from a single place.
        let controlInvocations = null;
        async function connect(instr) {
            const syncOptions = {
                path: '/sync/stream',
                abortSignal: abortController.signal,
                data: instr.request
            };
            if (resolvedOptions.connectionMethod == SyncStreamConnectionMethod.HTTP) {
                controlInvocations = await remote.postStreamRaw(syncOptions, (line) => {
                    if (typeof line == 'string') {
                        return {
                            command: PowerSyncControlCommand.PROCESS_TEXT_LINE,
                            payload: line
                        };
                    }
                    else {
                        // Directly enqueued by us
                        return line;
                    }
                });
            }
            else {
                controlInvocations = await remote.socketStreamRaw({
                    ...syncOptions,
                    fetchStrategy: resolvedOptions.fetchStrategy
                }, (payload) => {
                    if (payload instanceof Uint8Array) {
                        return {
                            command: PowerSyncControlCommand.PROCESS_BSON_LINE,
                            payload: payload
                        };
                    }
                    else {
                        // Directly enqueued by us
                        return payload;
                    }
                });
            }
            // The rust client will set connected: true after the first sync line because that's when it gets invoked, but
            // we're already connected here and can report that.
            syncImplementation.updateSyncStatus({ connected: true });
            try {
                while (!controlInvocations.closed) {
                    const line = await controlInvocations.read();
                    if (line == null) {
                        return;
                    }
                    await control(line.command, line.payload);
                    if (!hadSyncLine) {
                        syncImplementation.triggerCrudUpload();
                        hadSyncLine = true;
                    }
                }
            }
            finally {
                const activeInstructions = controlInvocations;
                // We concurrently add events to the active data stream when e.g. a CRUD upload is completed or a token is
                // refreshed. That would throw after closing (and we can't handle those events either way), so set this back
                // to null.
                controlInvocations = null;
                await activeInstructions.close();
            }
        }
        async function stop() {
            await control(PowerSyncControlCommand.STOP);
        }
        async function control(op, payload) {
            const rawResponse = await adapter.control(op, payload ?? null);
            const logger = syncImplementation.logger;
            logger.trace('powersync_control', op, payload == null || typeof payload == 'string' ? payload : '<bytes>', rawResponse);
            await handleInstructions(JSON.parse(rawResponse));
        }
        async function handleInstruction(instruction) {
            if ('LogLine' in instruction) {
                switch (instruction.LogLine.severity) {
                    case 'DEBUG':
                        syncImplementation.logger.debug(instruction.LogLine.line);
                        break;
                    case 'INFO':
                        syncImplementation.logger.info(instruction.LogLine.line);
                        break;
                    case 'WARNING':
                        syncImplementation.logger.warn(instruction.LogLine.line);
                        break;
                }
            }
            else if ('UpdateSyncStatus' in instruction) {
                syncImplementation.updateSyncStatus(coreStatusToJs(instruction.UpdateSyncStatus.status));
            }
            else if ('EstablishSyncStream' in instruction) {
                if (receivingLines != null) {
                    // Already connected, this shouldn't happen during a single iteration.
                    throw 'Unexpected request to establish sync stream, already connected';
                }
                receivingLines = connect(instruction.EstablishSyncStream);
            }
            else if ('FetchCredentials' in instruction) {
                if (instruction.FetchCredentials.did_expire) {
                    remote.invalidateCredentials();
                }
                else {
                    remote.invalidateCredentials();
                    // Restart iteration after the credentials have been refreshed.
                    remote.fetchCredentials().then((_) => {
                        controlInvocations?.enqueueData({ command: PowerSyncControlCommand.NOTIFY_TOKEN_REFRESHED });
                    }, (err) => {
                        syncImplementation.logger.warn('Could not prefetch credentials', err);
                    });
                }
            }
            else if ('CloseSyncStream' in instruction) {
                abortController.abort();
                hideDisconnectOnRestart = instruction.CloseSyncStream.hide_disconnect;
            }
            else if ('FlushFileSystem' in instruction) ;
            else if ('DidCompleteSync' in instruction) {
                syncImplementation.updateSyncStatus({
                    dataFlow: {
                        downloadError: undefined
                    }
                });
            }
        }
        async function handleInstructions(instructions) {
            for (const instr of instructions) {
                await handleInstruction(instr);
            }
        }
        try {
            const options = {
                parameters: resolvedOptions.params,
                app_metadata: resolvedOptions.appMetadata,
                active_streams: this.activeStreams,
                include_defaults: resolvedOptions.includeDefaultStreams
            };
            if (resolvedOptions.serializedSchema) {
                options.schema = resolvedOptions.serializedSchema;
            }
            await control(PowerSyncControlCommand.START, JSON.stringify(options));
            this.notifyCompletedUploads = () => {
                if (controlInvocations && !controlInvocations?.closed) {
                    controlInvocations.enqueueData({ command: PowerSyncControlCommand.NOTIFY_CRUD_UPLOAD_COMPLETED });
                }
            };
            this.handleActiveStreamsChange = () => {
                if (controlInvocations && !controlInvocations?.closed) {
                    controlInvocations.enqueueData({
                        command: PowerSyncControlCommand.UPDATE_SUBSCRIPTIONS,
                        payload: JSON.stringify(this.activeStreams)
                    });
                }
            };
            await receivingLines;
        }
        finally {
            this.notifyCompletedUploads = this.handleActiveStreamsChange = undefined;
            await stop();
        }
        return { immediateRestart: hideDisconnectOnRestart };
    }
    async updateSyncStatusForStartingCheckpoint(checkpoint) {
        const localProgress = await this.options.adapter.getBucketOperationProgress();
        const progress = {};
        let invalidated = false;
        for (const bucket of checkpoint.buckets) {
            const savedProgress = localProgress[bucket.bucket];
            const atLast = savedProgress?.atLast ?? 0;
            const sinceLast = savedProgress?.sinceLast ?? 0;
            progress[bucket.bucket] = {
                // The fallback priority doesn't matter here, but 3 is the one newer versions of the sync service
                // will use by default.
                priority: bucket.priority ?? 3,
                at_last: atLast,
                since_last: sinceLast,
                target_count: bucket.count ?? 0
            };
            if (bucket.count != null && bucket.count < atLast + sinceLast) {
                // Either due to a defrag / sync rule deploy or a compaction operation, the size
                // of the bucket shrank so much that the local ops exceed the ops in the updated
                // bucket. We can't prossibly report progress in this case (it would overshoot 100%).
                invalidated = true;
            }
        }
        if (invalidated) {
            for (const bucket in progress) {
                const bucketProgress = progress[bucket];
                bucketProgress.at_last = 0;
                bucketProgress.since_last = 0;
            }
        }
        this.updateSyncStatus({
            dataFlow: {
                downloading: true,
                downloadProgress: progress
            }
        });
    }
    async applyCheckpoint(checkpoint) {
        let result = await this.options.adapter.syncLocalDatabase(checkpoint);
        if (!result.checkpointValid) {
            this.logger.debug(`Checksum mismatch in checkpoint ${checkpoint.last_op_id}, will reconnect`);
            // This means checksums failed. Start again with a new checkpoint.
            // TODO: better back-off
            await new Promise((resolve) => setTimeout(resolve, 50));
            return { applied: false, endIteration: true };
        }
        else if (!result.ready) {
            this.logger.debug(`Could not apply checkpoint ${checkpoint.last_op_id} due to local data. We will retry applying the checkpoint after that upload is completed.`);
            return { applied: false, endIteration: false };
        }
        this.logger.debug(`Applied checkpoint ${checkpoint.last_op_id}`, checkpoint);
        this.updateSyncStatus({
            connected: true,
            lastSyncedAt: new Date(),
            dataFlow: {
                downloading: false,
                downloadProgress: null,
                downloadError: undefined
            }
        });
        return { applied: true, endIteration: false };
    }
    updateSyncStatus(options) {
        const updatedStatus = new SyncStatus({
            connected: options.connected ?? this.syncStatus.connected,
            connecting: !options.connected && (options.connecting ?? this.syncStatus.connecting),
            lastSyncedAt: options.lastSyncedAt ?? this.syncStatus.lastSyncedAt,
            dataFlow: {
                ...this.syncStatus.dataFlowStatus,
                ...options.dataFlow
            },
            priorityStatusEntries: options.priorityStatusEntries ?? this.syncStatus.priorityStatusEntries,
            clientImplementation: options.clientImplementation ?? this.syncStatus.clientImplementation
        });
        if (!this.syncStatus.isEqual(updatedStatus)) {
            this.syncStatus = updatedStatus;
            // Only trigger this is there was a change
            this.iterateListeners((cb) => cb.statusChanged?.(updatedStatus));
        }
        // trigger this for all updates
        this.iterateListeners((cb) => cb.statusUpdated?.(options));
    }
    async delayRetry(signal) {
        return new Promise((resolve) => {
            if (signal?.aborted) {
                // If the signal is already aborted, resolve immediately
                resolve();
                return;
            }
            const { retryDelayMs } = this.options;
            let timeoutId;
            const endDelay = () => {
                resolve();
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = undefined;
                }
                signal?.removeEventListener('abort', endDelay);
            };
            signal?.addEventListener('abort', endDelay, { once: true });
            timeoutId = setTimeout(endDelay, retryDelayMs);
        });
    }
    updateSubscriptions(subscriptions) {
        this.activeStreams = subscriptions;
        this.handleActiveStreamsChange?.();
    }
}

/**
 * SQLite operations to track changes for with {@link TriggerManager}
 * @experimental
 */
var DiffTriggerOperation;
(function (DiffTriggerOperation) {
    DiffTriggerOperation["INSERT"] = "INSERT";
    DiffTriggerOperation["UPDATE"] = "UPDATE";
    DiffTriggerOperation["DELETE"] = "DELETE";
})(DiffTriggerOperation || (DiffTriggerOperation = {}));

class TriggerManagerImpl {
    options;
    schema;
    constructor(options) {
        this.options = options;
        this.schema = options.schema;
        options.db.registerListener({
            schemaChanged: (schema) => {
                this.schema = schema;
            }
        });
    }
    get db() {
        return this.options.db;
    }
    async getUUID() {
        const { id: uuid } = await this.db.get(/* sql */ `
      SELECT
        uuid () as id
    `);
        // Replace dashes with underscores for SQLite table/trigger name compatibility
        return uuid.replace(/-/g, '_');
    }
    async removeTriggers(tx, triggerIds) {
        for (const triggerId of triggerIds) {
            await tx.execute(/* sql */ `DROP TRIGGER IF EXISTS ${triggerId}; `);
        }
    }
    async createDiffTrigger(options) {
        await this.db.waitForReady();
        const { source, destination, columns, when, hooks } = options;
        const operations = Object.keys(when);
        if (operations.length == 0) {
            throw new Error('At least one WHEN operation must be specified for the trigger.');
        }
        const whenClauses = Object.fromEntries(Object.entries(when).map(([operation, filter]) => [operation, `WHEN ${filter}`]));
        /**
         * Allow specifying the View name as the source.
         * We can lookup the internal table name from the schema.
         */
        const sourceDefinition = this.schema.tables.find((table) => table.viewName == source);
        if (!sourceDefinition) {
            throw new Error(`Source table or view "${source}" not found in the schema.`);
        }
        const replicatedColumns = columns ?? sourceDefinition.columns.map((col) => col.name);
        const internalSource = sourceDefinition.internalName;
        const triggerIds = [];
        const id = await this.getUUID();
        /**
         * We default to replicating all columns if no columns array is provided.
         */
        const jsonFragment = (source = 'NEW') => {
            if (columns == null) {
                // Track all columns
                return `${source}.data`;
            }
            else if (columns.length == 0) {
                // Don't track any columns except for the id
                return `'{}'`;
            }
            else {
                // Filter the data by the replicated columns
                return `json_object(${replicatedColumns.map((col) => `'${col}', json_extract(${source}.data, '$.${col}')`).join(', ')})`;
            }
        };
        const disposeWarningListener = this.db.registerListener({
            schemaChanged: () => {
                this.db.logger.warn(`The PowerSync schema has changed while previously configured triggers are still operational. This might cause unexpected results.`);
            }
        });
        /**
         * Declare the cleanup function early since if any of the init steps fail,
         * we need to ensure we can cleanup the created resources.
         * We unfortunately cannot rely on transaction rollback.
         */
        const cleanup = async () => {
            disposeWarningListener();
            return this.db.writeLock(async (tx) => {
                await this.removeTriggers(tx, triggerIds);
                await tx.execute(/* sql */ `DROP TABLE IF EXISTS ${destination};`);
            });
        };
        const setup = async (tx) => {
            // Allow user code to execute in this lock context before the trigger is created.
            await hooks?.beforeCreate?.(tx);
            await tx.execute(/* sql */ `
        CREATE TEMP TABLE ${destination} (
          operation_id INTEGER PRIMARY KEY AUTOINCREMENT,
          id TEXT,
          operation TEXT,
          timestamp TEXT,
          value TEXT,
          previous_value TEXT
        );
      `);
            if (operations.includes(DiffTriggerOperation.INSERT)) {
                const insertTriggerId = `ps_temp_trigger_insert_${id}`;
                triggerIds.push(insertTriggerId);
                await tx.execute(/* sql */ `
          CREATE TEMP TRIGGER ${insertTriggerId} AFTER INSERT ON ${internalSource} ${whenClauses[DiffTriggerOperation.INSERT]} BEGIN
          INSERT INTO
            ${destination} (id, operation, timestamp, value)
          VALUES
            (
              NEW.id,
              'INSERT',
              strftime ('%Y-%m-%dT%H:%M:%fZ', 'now'),
              ${jsonFragment('NEW')}
            );

          END;
        `);
            }
            if (operations.includes(DiffTriggerOperation.UPDATE)) {
                const updateTriggerId = `ps_temp_trigger_update_${id}`;
                triggerIds.push(updateTriggerId);
                await tx.execute(/* sql */ `
          CREATE TEMP TRIGGER ${updateTriggerId} AFTER
          UPDATE ON ${internalSource} ${whenClauses[DiffTriggerOperation.UPDATE]} BEGIN
          INSERT INTO
            ${destination} (id, operation, timestamp, value, previous_value)
          VALUES
            (
              NEW.id,
              'UPDATE',
              strftime ('%Y-%m-%dT%H:%M:%fZ', 'now'),
              ${jsonFragment('NEW')},
              ${jsonFragment('OLD')}
            );

          END;
        `);
            }
            if (operations.includes(DiffTriggerOperation.DELETE)) {
                const deleteTriggerId = `ps_temp_trigger_delete_${id}`;
                triggerIds.push(deleteTriggerId);
                // Create delete trigger for basic JSON
                await tx.execute(/* sql */ `
          CREATE TEMP TRIGGER ${deleteTriggerId} AFTER DELETE ON ${internalSource} ${whenClauses[DiffTriggerOperation.DELETE]} BEGIN
          INSERT INTO
            ${destination} (id, operation, timestamp, value)
          VALUES
            (
              OLD.id,
              'DELETE',
              strftime ('%Y-%m-%dT%H:%M:%fZ', 'now'),
              ${jsonFragment('OLD')}
            );

          END;
        `);
            }
        };
        try {
            await this.db.writeLock(setup);
            return cleanup;
        }
        catch (error) {
            try {
                await cleanup();
            }
            catch (cleanupError) {
                throw new AggregateError([error, cleanupError], 'Error during operation and cleanup');
            }
            throw error;
        }
    }
    async trackTableDiff(options) {
        const { source, when, columns, hooks, throttleMs = DEFAULT_WATCH_THROTTLE_MS } = options;
        await this.db.waitForReady();
        /**
         * Allow specifying the View name as the source.
         * We can lookup the internal table name from the schema.
         */
        const sourceDefinition = this.schema.tables.find((table) => table.viewName == source);
        if (!sourceDefinition) {
            throw new Error(`Source table or view "${source}" not found in the schema.`);
        }
        // The columns to present in the onChange context methods.
        // If no array is provided, we use all columns from the source table.
        const contextColumns = columns ?? sourceDefinition.columns.map((col) => col.name);
        const id = await this.getUUID();
        const destination = `ps_temp_track_${source}_${id}`;
        // register an onChange before the trigger is created
        const abortController = new AbortController();
        const abortOnChange = () => abortController.abort();
        this.db.onChange({
            // Note that the onChange events here have their execution scheduled.
            // Callbacks are throttled and are sequential.
            onChange: async () => {
                if (abortController.signal.aborted)
                    return;
                // Run the handler in a write lock to keep the state of the
                // destination table consistent.
                await this.db.writeTransaction(async (tx) => {
                    const callbackResult = await options.onChange({
                        ...tx,
                        destinationTable: destination,
                        withDiff: async (query, params, options) => {
                            // Wrap the query to expose the destination table
                            const operationIdSelect = options?.castOperationIdAsText
                                ? 'id, operation, CAST(operation_id AS TEXT) as operation_id, timestamp, value, previous_value'
                                : '*';
                            const wrappedQuery = /* sql */ `
                  WITH
                    DIFF AS (
                      SELECT
                        ${operationIdSelect}
                      FROM
                        ${destination}
                      ORDER BY
                        operation_id ASC
                    ) ${query}
                `;
                            return tx.getAll(wrappedQuery, params);
                        },
                        withExtractedDiff: async (query, params) => {
                            // Wrap the query to expose the destination table
                            const wrappedQuery = /* sql */ `
                  WITH
                    DIFF AS (
                      SELECT
                        id,
                        ${contextColumns.length > 0
                                ? `${contextColumns.map((col) => `json_extract(value, '$.${col}') as ${col}`).join(', ')},`
                                : ''} operation_id as __operation_id,
                        operation as __operation,
                        timestamp as __timestamp,
                        previous_value as __previous_value
                      FROM
                        ${destination}
                      ORDER BY
                        __operation_id ASC
                    ) ${query}
                `;
                            return tx.getAll(wrappedQuery, params);
                        }
                    });
                    // Clear the destination table after processing
                    await tx.execute(/* sql */ `DELETE FROM ${destination};`);
                    return callbackResult;
                });
            }
        }, { tables: [destination], signal: abortController.signal, throttleMs });
        try {
            const removeTrigger = await this.createDiffTrigger({
                source,
                destination,
                columns: contextColumns,
                when,
                hooks
            });
            return async () => {
                abortOnChange();
                await removeTrigger();
            };
        }
        catch (error) {
            try {
                abortOnChange();
            }
            catch (cleanupError) {
                throw new AggregateError([error, cleanupError], 'Error during operation and cleanup');
            }
            throw error;
        }
    }
}

const POWERSYNC_TABLE_MATCH = /(^ps_data__|^ps_data_local__)/;
const DEFAULT_DISCONNECT_CLEAR_OPTIONS = {
    clearLocal: true
};
const DEFAULT_POWERSYNC_CLOSE_OPTIONS = {
    disconnect: true
};
const DEFAULT_POWERSYNC_DB_OPTIONS = {
    retryDelayMs: 5000,
    crudUploadThrottleMs: DEFAULT_CRUD_UPLOAD_THROTTLE_MS
};
const DEFAULT_CRUD_BATCH_LIMIT = 100;
/**
 * Requesting nested or recursive locks can block the application in some circumstances.
 * This default lock timeout will act as a failsafe to throw an error if a lock cannot
 * be obtained.
 */
const DEFAULT_LOCK_TIMEOUT_MS = 120_000; // 2 mins
/**
 * Tests if the input is a {@link PowerSyncDatabaseOptionsWithSettings}
 * @internal
 */
const isPowerSyncDatabaseOptionsWithSettings = (test) => {
    return typeof test == 'object' && isSQLOpenOptions(test.database);
};
class AbstractPowerSyncDatabase extends BaseObserver {
    options;
    /**
     * Returns true if the connection is closed.
     */
    closed;
    ready;
    /**
     * Current connection status.
     */
    currentStatus;
    sdkVersion;
    bucketStorageAdapter;
    _isReadyPromise;
    connectionManager;
    subscriptions;
    get syncStreamImplementation() {
        return this.connectionManager.syncStreamImplementation;
    }
    /**
     * The connector used to connect to the PowerSync service.
     *
     * @returns The connector used to connect to the PowerSync service or null if `connect()` has not been called.
     */
    get connector() {
        return this.connectionManager.connector;
    }
    /**
     * The resolved connection options used to connect to the PowerSync service.
     *
     * @returns The resolved connection options used to connect to the PowerSync service or null if `connect()` has not been called.
     */
    get connectionOptions() {
        return this.connectionManager.connectionOptions;
    }
    _schema;
    _database;
    runExclusiveMutex;
    /**
     * @experimental
     * Allows creating SQLite triggers which can be used to track various operations on SQLite tables.
     */
    triggers;
    logger;
    constructor(options) {
        super();
        this.options = options;
        const { database, schema } = options;
        if (typeof schema?.toJSON != 'function') {
            throw new Error('The `schema` option should be provided and should be an instance of `Schema`.');
        }
        if (isDBAdapter(database)) {
            this._database = database;
        }
        else if (isSQLOpenFactory(database)) {
            this._database = database.openDB();
        }
        else if (isPowerSyncDatabaseOptionsWithSettings(options)) {
            this._database = this.openDBAdapter(options);
        }
        else {
            throw new Error('The provided `database` option is invalid.');
        }
        this.logger = options.logger ?? Logger.get(`PowerSyncDatabase[${this._database.name}]`);
        this.bucketStorageAdapter = this.generateBucketStorageAdapter();
        this.closed = false;
        this.currentStatus = new SyncStatus({});
        this.options = { ...DEFAULT_POWERSYNC_DB_OPTIONS, ...options };
        this._schema = schema;
        this.ready = false;
        this.sdkVersion = '';
        this.runExclusiveMutex = new async_mutex__WEBPACK_IMPORTED_MODULE_0__.Mutex();
        // Start async init
        this.subscriptions = {
            firstStatusMatching: (predicate, abort) => this.waitForStatus(predicate, abort),
            resolveOfflineSyncStatus: () => this.resolveOfflineSyncStatus(),
            rustSubscriptionsCommand: async (payload) => {
                await this.writeTransaction((tx) => {
                    return tx.execute('select powersync_control(?,?)', ['subscriptions', JSON.stringify(payload)]);
                });
            }
        };
        this.connectionManager = new ConnectionManager({
            createSyncImplementation: async (connector, options) => {
                await this.waitForReady();
                return this.runExclusive(async () => {
                    const sync = this.generateSyncStreamImplementation(connector, this.resolvedConnectionOptions(options));
                    const onDispose = sync.registerListener({
                        statusChanged: (status) => {
                            this.currentStatus = new SyncStatus({
                                ...status.toJSON(),
                                hasSynced: this.currentStatus?.hasSynced || !!status.lastSyncedAt
                            });
                            this.iterateListeners((cb) => cb.statusChanged?.(this.currentStatus));
                        }
                    });
                    await sync.waitForReady();
                    return {
                        sync,
                        onDispose
                    };
                });
            },
            logger: this.logger
        });
        this._isReadyPromise = this.initialize();
        this.triggers = new TriggerManagerImpl({
            db: this,
            schema: this.schema
        });
    }
    /**
     * Schema used for the local database.
     */
    get schema() {
        return this._schema;
    }
    /**
     * The underlying database.
     *
     * For the most part, behavior is the same whether querying on the underlying database, or on {@link AbstractPowerSyncDatabase}.
     */
    get database() {
        return this._database;
    }
    /**
     * Whether a connection to the PowerSync service is currently open.
     */
    get connected() {
        return this.currentStatus?.connected || false;
    }
    get connecting() {
        return this.currentStatus?.connecting || false;
    }
    /**
     * @returns A promise which will resolve once initialization is completed.
     */
    async waitForReady() {
        if (this.ready) {
            return;
        }
        await this._isReadyPromise;
    }
    /**
     * Wait for the first sync operation to complete.
     *
     * @param request Either an abort signal (after which the promise will complete regardless of
     * whether a full sync was completed) or an object providing an abort signal and a priority target.
     * When a priority target is set, the promise may complete when all buckets with the given (or higher)
     * priorities have been synchronized. This can be earlier than a complete sync.
     * @returns A promise which will resolve once the first full sync has completed.
     */
    async waitForFirstSync(request) {
        const signal = request instanceof AbortSignal ? request : request?.signal;
        const priority = request && 'priority' in request ? request.priority : undefined;
        const statusMatches = priority === undefined
            ? (status) => status.hasSynced
            : (status) => status.statusForPriority(priority).hasSynced;
        return this.waitForStatus(statusMatches, signal);
    }
    /**
     * Waits for the first sync status for which the `status` callback returns a truthy value.
     */
    async waitForStatus(predicate, signal) {
        if (predicate(this.currentStatus)) {
            return;
        }
        return new Promise((resolve) => {
            const dispose = this.registerListener({
                statusChanged: (status) => {
                    if (predicate(status)) {
                        abort();
                    }
                }
            });
            function abort() {
                dispose();
                resolve();
            }
            if (signal?.aborted) {
                abort();
            }
            else {
                signal?.addEventListener('abort', abort);
            }
        });
    }
    /**
     * Entry point for executing initialization logic.
     * This is to be automatically executed in the constructor.
     */
    async initialize() {
        await this._initialize();
        await this.bucketStorageAdapter.init();
        await this._loadVersion();
        await this.updateSchema(this.options.schema);
        await this.resolveOfflineSyncStatus();
        await this.database.execute('PRAGMA RECURSIVE_TRIGGERS=TRUE');
        this.ready = true;
        this.iterateListeners((cb) => cb.initialized?.());
    }
    async _loadVersion() {
        try {
            const { version } = await this.database.get('SELECT powersync_rs_version() as version');
            this.sdkVersion = version;
        }
        catch (e) {
            throw new Error(`The powersync extension is not loaded correctly. Details: ${e.message}`);
        }
        let versionInts;
        try {
            versionInts = this.sdkVersion.split(/[.\/]/)
                .slice(0, 3)
                .map((n) => parseInt(n));
        }
        catch (e) {
            throw new Error(`Unsupported powersync extension version. Need >=0.4.10 <1.0.0, got: ${this.sdkVersion}. Details: ${e.message}`);
        }
        // Validate >=0.4.10 <1.0.0
        if (versionInts[0] != 0 || versionInts[1] < 4 || (versionInts[1] == 4 && versionInts[2] < 10)) {
            throw new Error(`Unsupported powersync extension version. Need >=0.4.10 <1.0.0, got: ${this.sdkVersion}`);
        }
    }
    async resolveOfflineSyncStatus() {
        const result = await this.database.get('SELECT powersync_offline_sync_status() as r');
        const parsed = JSON.parse(result.r);
        const updatedStatus = new SyncStatus({
            ...this.currentStatus.toJSON(),
            ...coreStatusToJs(parsed)
        });
        if (!updatedStatus.isEqual(this.currentStatus)) {
            this.currentStatus = updatedStatus;
            this.iterateListeners((l) => l.statusChanged?.(this.currentStatus));
        }
    }
    /**
     * Replace the schema with a new version. This is for advanced use cases - typically the schema should just be specified once in the constructor.
     *
     * Cannot be used while connected - this should only be called before {@link AbstractPowerSyncDatabase.connect}.
     */
    async updateSchema(schema) {
        if (this.syncStreamImplementation) {
            throw new Error('Cannot update schema while connected');
        }
        /**
         * TODO
         * Validations only show a warning for now.
         * The next major release should throw an exception.
         */
        try {
            schema.validate();
        }
        catch (ex) {
            this.logger.warn('Schema validation failed. Unexpected behaviour could occur', ex);
        }
        this._schema = schema;
        await this.database.execute('SELECT powersync_replace_schema(?)', [JSON.stringify(this.schema.toJSON())]);
        await this.database.refreshSchema();
        this.iterateListeners(async (cb) => cb.schemaChanged?.(schema));
    }
    /**
     * Wait for initialization to complete.
     * While initializing is automatic, this helps to catch and report initialization errors.
     */
    async init() {
        return this.waitForReady();
    }
    // Use the options passed in during connect, or fallback to the options set during database creation or fallback to the default options
    resolvedConnectionOptions(options) {
        return {
            ...options,
            retryDelayMs: options?.retryDelayMs ?? this.options.retryDelayMs ?? this.options.retryDelay ?? DEFAULT_RETRY_DELAY_MS,
            crudUploadThrottleMs: options?.crudUploadThrottleMs ?? this.options.crudUploadThrottleMs ?? DEFAULT_CRUD_UPLOAD_THROTTLE_MS
        };
    }
    /**
     * @deprecated Use {@link AbstractPowerSyncDatabase#close} instead.
     * Clears all listeners registered by {@link AbstractPowerSyncDatabase#registerListener}.
     */
    dispose() {
        return super.dispose();
    }
    /**
     * Locking mechanism for exclusively running critical portions of connect/disconnect operations.
     * Locking here is mostly only important on web for multiple tab scenarios.
     */
    runExclusive(callback) {
        return this.runExclusiveMutex.runExclusive(callback);
    }
    /**
     * Connects to stream of events from the PowerSync instance.
     */
    async connect(connector, options) {
        const resolvedOptions = options ?? {};
        resolvedOptions.serializedSchema = this.schema.toJSON();
        return this.connectionManager.connect(connector, resolvedOptions);
    }
    /**
     * Close the sync connection.
     *
     * Use {@link connect} to connect again.
     */
    async disconnect() {
        return this.connectionManager.disconnect();
    }
    /**
     *  Disconnect and clear the database.
     *  Use this when logging out.
     *  The database can still be queried after this is called, but the tables
     *  would be empty.
     *
     * To preserve data in local-only tables, set clearLocal to false.
     */
    async disconnectAndClear(options = DEFAULT_DISCONNECT_CLEAR_OPTIONS) {
        await this.disconnect();
        await this.waitForReady();
        const { clearLocal } = options;
        // TODO DB name, verify this is necessary with extension
        await this.database.writeTransaction(async (tx) => {
            await tx.execute('SELECT powersync_clear(?)', [clearLocal ? 1 : 0]);
        });
        // The data has been deleted - reset the sync status
        this.currentStatus = new SyncStatus({});
        this.iterateListeners((l) => l.statusChanged?.(this.currentStatus));
    }
    /**
     * Create a sync stream to query its status or to subscribe to it.
     *
     * @param name The name of the stream to subscribe to.
     * @param params Optional parameters for the stream subscription.
     * @returns A {@link SyncStream} instance that can be subscribed to.
     * @experimental Sync streams are currently in alpha.
     */
    syncStream(name, params) {
        return this.connectionManager.stream(this.subscriptions, name, params ?? null);
    }
    /**
     * Close the database, releasing resources.
     *
     * Also disconnects any active connection.
     *
     * Once close is called, this connection cannot be used again - a new one
     * must be constructed.
     */
    async close(options = DEFAULT_POWERSYNC_CLOSE_OPTIONS) {
        await this.waitForReady();
        if (this.closed) {
            return;
        }
        await this.iterateAsyncListeners(async (cb) => cb.closing?.());
        const { disconnect } = options;
        if (disconnect) {
            await this.disconnect();
        }
        await this.connectionManager.close();
        await this.database.close();
        this.closed = true;
        await this.iterateAsyncListeners(async (cb) => cb.closed?.());
    }
    /**
     * Get upload queue size estimate and count.
     */
    async getUploadQueueStats(includeSize) {
        return this.readTransaction(async (tx) => {
            if (includeSize) {
                const result = await tx.execute(`SELECT SUM(cast(data as blob) + 20) as size, count(*) as count FROM ${PSInternalTable.CRUD}`);
                const row = result.rows.item(0);
                return new UploadQueueStats(row?.count ?? 0, row?.size ?? 0);
            }
            else {
                const result = await tx.execute(`SELECT count(*) as count FROM ${PSInternalTable.CRUD}`);
                const row = result.rows.item(0);
                return new UploadQueueStats(row?.count ?? 0);
            }
        });
    }
    /**
     * Get a batch of CRUD data to upload.
     *
     * Returns null if there is no data to upload.
     *
     * Use this from the {@link PowerSyncBackendConnector.uploadData} callback.
     *
     * Once the data have been successfully uploaded, call {@link CrudBatch.complete} before
     * requesting the next batch.
     *
     * Use {@link limit} to specify the maximum number of updates to return in a single
     * batch.
     *
     * This method does include transaction ids in the result, but does not group
     * data by transaction. One batch may contain data from multiple transactions,
     * and a single transaction may be split over multiple batches.
     *
     * @param limit Maximum number of CRUD entries to include in the batch
     * @returns A batch of CRUD operations to upload, or null if there are none
     */
    async getCrudBatch(limit = DEFAULT_CRUD_BATCH_LIMIT) {
        const result = await this.getAll(`SELECT id, tx_id, data FROM ${PSInternalTable.CRUD} ORDER BY id ASC LIMIT ?`, [limit + 1]);
        const all = result.map((row) => CrudEntry.fromRow(row)) ?? [];
        let haveMore = false;
        if (all.length > limit) {
            all.pop();
            haveMore = true;
        }
        if (all.length == 0) {
            return null;
        }
        const last = all[all.length - 1];
        return new CrudBatch(all, haveMore, async (writeCheckpoint) => this.handleCrudCheckpoint(last.clientId, writeCheckpoint));
    }
    /**
     * Get the next recorded transaction to upload.
     *
     * Returns null if there is no data to upload.
     *
     * Use this from the {@link PowerSyncBackendConnector.uploadData} callback.
     *
     * Once the data have been successfully uploaded, call {@link CrudTransaction.complete} before
     * requesting the next transaction.
     *
     * Unlike {@link getCrudBatch}, this only returns data from a single transaction at a time.
     * All data for the transaction is loaded into memory.
     *
     * @returns A transaction of CRUD operations to upload, or null if there are none
     */
    async getNextCrudTransaction() {
        const iterator = this.getCrudTransactions()[symbolAsyncIterator]();
        return (await iterator.next()).value;
    }
    /**
     * Returns an async iterator of completed transactions with local writes against the database.
     *
     * This is typically used from the {@link PowerSyncBackendConnector.uploadData} callback. Each entry emitted by the
     * returned iterator is a full transaction containing all local writes made while that transaction was active.
     *
     * Unlike {@link getNextCrudTransaction}, which always returns the oldest transaction that hasn't been
     * {@link CrudTransaction.complete}d yet, this iterator can be used to receive multiple transactions. Calling
     * {@link CrudTransaction.complete} will mark that and all prior transactions emitted by the iterator as completed.
     *
     * This can be used to upload multiple transactions in a single batch, e.g with:
     *
     * ```JavaScript
     * let lastTransaction = null;
     * let batch = [];
     *
     * for await (const transaction of database.getCrudTransactions()) {
     *   batch.push(...transaction.crud);
     *   lastTransaction = transaction;
     *
     *   if (batch.length > 10) {
     *     break;
     *    }
     * }
     * ```
     *
     * If there is no local data to upload, the async iterator complete without emitting any items.
     *
     * Note that iterating over async iterables requires a [polyfill](https://github.com/powersync-ja/powersync-js/tree/main/packages/react-native#babel-plugins-watched-queries)
     * for React Native.
     */
    getCrudTransactions() {
        return {
            [symbolAsyncIterator]: () => {
                let lastCrudItemId = -1;
                const sql = `
WITH RECURSIVE crud_entries AS (
  SELECT id, tx_id, data FROM ps_crud WHERE id = (SELECT min(id) FROM ps_crud WHERE id > ?)
  UNION ALL
  SELECT ps_crud.id, ps_crud.tx_id, ps_crud.data FROM ps_crud
    INNER JOIN crud_entries ON crud_entries.id + 1 = rowid
  WHERE crud_entries.tx_id = ps_crud.tx_id
)
SELECT * FROM crud_entries;
    `;
                return {
                    next: async () => {
                        const nextTransaction = await this.database.getAll(sql, [lastCrudItemId]);
                        if (nextTransaction.length == 0) {
                            return { done: true, value: null };
                        }
                        const items = nextTransaction.map((row) => CrudEntry.fromRow(row));
                        const last = items[items.length - 1];
                        const txId = last.transactionId;
                        lastCrudItemId = last.clientId;
                        return {
                            done: false,
                            value: new CrudTransaction(items, async (writeCheckpoint) => this.handleCrudCheckpoint(last.clientId, writeCheckpoint), txId)
                        };
                    }
                };
            }
        };
    }
    /**
     * Get an unique client id for this database.
     *
     * The id is not reset when the database is cleared, only when the database is deleted.
     *
     * @returns A unique identifier for the database instance
     */
    async getClientId() {
        return this.bucketStorageAdapter.getClientId();
    }
    async handleCrudCheckpoint(lastClientId, writeCheckpoint) {
        return this.writeTransaction(async (tx) => {
            await tx.execute(`DELETE FROM ${PSInternalTable.CRUD} WHERE id <= ?`, [lastClientId]);
            if (writeCheckpoint) {
                const check = await tx.execute(`SELECT 1 FROM ${PSInternalTable.CRUD} LIMIT 1`);
                if (!check.rows?.length) {
                    await tx.execute(`UPDATE ${PSInternalTable.BUCKETS} SET target_op = CAST(? as INTEGER) WHERE name='$local'`, [
                        writeCheckpoint
                    ]);
                }
            }
            else {
                await tx.execute(`UPDATE ${PSInternalTable.BUCKETS} SET target_op = CAST(? as INTEGER) WHERE name='$local'`, [
                    this.bucketStorageAdapter.getMaxOpId()
                ]);
            }
        });
    }
    /**
     * Execute a SQL write (INSERT/UPDATE/DELETE) query
     * and optionally return results.
     *
     * @param sql The SQL query to execute
     * @param parameters Optional array of parameters to bind to the query
     * @returns The query result as an object with structured key-value pairs
     */
    async execute(sql, parameters) {
        return this.writeLock((tx) => tx.execute(sql, parameters));
    }
    /**
     * Execute a SQL write (INSERT/UPDATE/DELETE) query directly on the database without any PowerSync processing.
     * This bypasses certain PowerSync abstractions and is useful for accessing the raw database results.
     *
     * @param sql The SQL query to execute
     * @param parameters Optional array of parameters to bind to the query
     * @returns The raw query result from the underlying database as a nested array of raw values, where each row is
     * represented as an array of column values without field names.
     */
    async executeRaw(sql, parameters) {
        await this.waitForReady();
        return this.database.executeRaw(sql, parameters);
    }
    /**
     * Execute a write query (INSERT/UPDATE/DELETE) multiple times with each parameter set
     * and optionally return results.
     * This is faster than executing separately with each parameter set.
     *
     * @param sql The SQL query to execute
     * @param parameters Optional 2D array of parameter sets, where each inner array is a set of parameters for one execution
     * @returns The query result
     */
    async executeBatch(sql, parameters) {
        await this.waitForReady();
        return this.database.executeBatch(sql, parameters);
    }
    /**
     *  Execute a read-only query and return results.
     *
     * @param sql The SQL query to execute
     * @param parameters Optional array of parameters to bind to the query
     * @returns An array of results
     */
    async getAll(sql, parameters) {
        await this.waitForReady();
        return this.database.getAll(sql, parameters);
    }
    /**
     * Execute a read-only query and return the first result, or null if the ResultSet is empty.
     *
     * @param sql The SQL query to execute
     * @param parameters Optional array of parameters to bind to the query
     * @returns The first result if found, or null if no results are returned
     */
    async getOptional(sql, parameters) {
        await this.waitForReady();
        return this.database.getOptional(sql, parameters);
    }
    /**
     * Execute a read-only query and return the first result, error if the ResultSet is empty.
     *
     * @param sql The SQL query to execute
     * @param parameters Optional array of parameters to bind to the query
     * @returns The first result matching the query
     * @throws Error if no rows are returned
     */
    async get(sql, parameters) {
        await this.waitForReady();
        return this.database.get(sql, parameters);
    }
    /**
     * Takes a read lock, without starting a transaction.
     * In most cases, {@link readTransaction} should be used instead.
     */
    async readLock(callback) {
        await this.waitForReady();
        return this.database.readLock(callback);
    }
    /**
     * Takes a global lock, without starting a transaction.
     * In most cases, {@link writeTransaction} should be used instead.
     */
    async writeLock(callback) {
        await this.waitForReady();
        return this.database.writeLock(callback);
    }
    /**
     * Open a read-only transaction.
     * Read transactions can run concurrently to a write transaction.
     * Changes from any write transaction are not visible to read transactions started before it.
     *
     * @param callback Function to execute within the transaction
     * @param lockTimeout Time in milliseconds to wait for a lock before throwing an error
     * @returns The result of the callback
     * @throws Error if the lock cannot be obtained within the timeout period
     */
    async readTransaction(callback, lockTimeout = DEFAULT_LOCK_TIMEOUT_MS) {
        await this.waitForReady();
        return this.database.readTransaction(async (tx) => {
            const res = await callback({ ...tx });
            await tx.rollback();
            return res;
        }, { timeoutMs: lockTimeout });
    }
    /**
     * Open a read-write transaction.
     * This takes a global lock - only one write transaction can execute against the database at a time.
     * Statements within the transaction must be done on the provided {@link Transaction} interface.
     *
     * @param callback Function to execute within the transaction
     * @param lockTimeout Time in milliseconds to wait for a lock before throwing an error
     * @returns The result of the callback
     * @throws Error if the lock cannot be obtained within the timeout period
     */
    async writeTransaction(callback, lockTimeout = DEFAULT_LOCK_TIMEOUT_MS) {
        await this.waitForReady();
        return this.database.writeTransaction(async (tx) => {
            const res = await callback(tx);
            await tx.commit();
            return res;
        }, { timeoutMs: lockTimeout });
    }
    watch(sql, parameters, handlerOrOptions, maybeOptions) {
        if (handlerOrOptions && typeof handlerOrOptions === 'object' && 'onResult' in handlerOrOptions) {
            const handler = handlerOrOptions;
            const options = maybeOptions;
            return this.watchWithCallback(sql, parameters, handler, options);
        }
        const options = handlerOrOptions;
        return this.watchWithAsyncGenerator(sql, parameters, options);
    }
    /**
     * Allows defining a query which can be used to build a {@link WatchedQuery}.
     * The defined query will be executed with {@link AbstractPowerSyncDatabase#getAll}.
     * An optional mapper function can be provided to transform the results.
     *
     * @example
     * ```javascript
     * const watchedTodos = powersync.query({
     *  sql: `SELECT photo_id as id FROM todos WHERE photo_id IS NOT NULL`,
     *  parameters: [],
     *  mapper: (row) => ({
     *    ...row,
     *    created_at: new Date(row.created_at as string)
     *  })
     * })
     * .watch()
     * // OR use .differentialWatch() for fine-grained watches.
     * ```
     */
    query(query) {
        const { sql, parameters = [], mapper } = query;
        const compatibleQuery = {
            compile: () => ({
                sql,
                parameters
            }),
            execute: async ({ sql, parameters }) => {
                const result = await this.getAll(sql, parameters);
                return mapper ? result.map(mapper) : result;
            }
        };
        return this.customQuery(compatibleQuery);
    }
    /**
     * Allows building a {@link WatchedQuery} using an existing {@link WatchCompatibleQuery}.
     * The watched query will use the provided {@link WatchCompatibleQuery.execute} method to query results.
     *
     * @example
     * ```javascript
     *
     * // Potentially a query from an ORM like Drizzle
     * const query = db.select().from(lists);
     *
     * const watchedTodos = powersync.customQuery(query)
     * .watch()
     * // OR use .differentialWatch() for fine-grained watches.
     * ```
     */
    customQuery(query) {
        return new CustomQuery({
            db: this,
            query
        });
    }
    /**
     * Execute a read query every time the source tables are modified.
     * Use {@link SQLWatchOptions.throttleMs} to specify the minimum interval between queries.
     * Source tables are automatically detected using `EXPLAIN QUERY PLAN`.
     *
     * Note that the `onChange` callback member of the handler is required.
     *
     * @param sql The SQL query to execute
     * @param parameters Optional array of parameters to bind to the query
     * @param handler Callbacks for handling results and errors
     * @param options Options for configuring watch behavior
     */
    watchWithCallback(sql, parameters, handler, options) {
        const { onResult, onError = (e) => this.logger.error(e) } = handler ?? {};
        if (!onResult) {
            throw new Error('onResult is required');
        }
        const { comparator } = options ?? {};
        // This API yields a QueryResult type.
        // This is not a standard Array result, which makes it incompatible with the .query API.
        const watchedQuery = new OnChangeQueryProcessor({
            db: this,
            comparator,
            placeholderData: null,
            watchOptions: {
                query: {
                    compile: () => ({
                        sql: sql,
                        parameters: parameters ?? []
                    }),
                    execute: () => this.executeReadOnly(sql, parameters)
                },
                reportFetching: false,
                throttleMs: options?.throttleMs ?? DEFAULT_WATCH_THROTTLE_MS,
                triggerOnTables: options?.tables
            }
        });
        const dispose = watchedQuery.registerListener({
            onData: (data) => {
                if (!data) {
                    // This should not happen. We only use null for the initial data.
                    return;
                }
                onResult(data);
            },
            onError: (error) => {
                onError(error);
            }
        });
        options?.signal?.addEventListener('abort', () => {
            dispose();
            watchedQuery.close();
        });
    }
    /**
     * Execute a read query every time the source tables are modified.
     * Use {@link SQLWatchOptions.throttleMs} to specify the minimum interval between queries.
     * Source tables are automatically detected using `EXPLAIN QUERY PLAN`.
     *
     * @param sql The SQL query to execute
     * @param parameters Optional array of parameters to bind to the query
     * @param options Options for configuring watch behavior
     * @returns An AsyncIterable that yields QueryResults whenever the data changes
     */
    watchWithAsyncGenerator(sql, parameters, options) {
        return new domExports.EventIterator((eventOptions) => {
            const handler = {
                onResult: (result) => {
                    eventOptions.push(result);
                },
                onError: (error) => {
                    eventOptions.fail(error);
                }
            };
            this.watchWithCallback(sql, parameters, handler, options);
            options?.signal?.addEventListener('abort', () => {
                eventOptions.stop();
            });
        });
    }
    /**
     * Resolves the list of tables that are used in a SQL query.
     * If tables are specified in the options, those are used directly.
     * Otherwise, analyzes the query using EXPLAIN to determine which tables are accessed.
     *
     * @param sql The SQL query to analyze
     * @param parameters Optional parameters for the SQL query
     * @param options Optional watch options that may contain explicit table list
     * @returns Array of table names that the query depends on
     */
    async resolveTables(sql, parameters, options) {
        const resolvedTables = options?.tables ? [...options.tables] : [];
        if (!options?.tables) {
            const explained = await this.getAll(`EXPLAIN ${sql}`, parameters);
            const rootPages = explained
                .filter((row) => row.opcode == 'OpenRead' && row.p3 == 0 && typeof row.p2 == 'number')
                .map((row) => row.p2);
            const tables = await this.getAll(`SELECT DISTINCT tbl_name FROM sqlite_master WHERE rootpage IN (SELECT json_each.value FROM json_each(?))`, [JSON.stringify(rootPages)]);
            for (const table of tables) {
                resolvedTables.push(table.tbl_name.replace(POWERSYNC_TABLE_MATCH, ''));
            }
        }
        return resolvedTables;
    }
    onChange(handlerOrOptions, maybeOptions) {
        if (handlerOrOptions && typeof handlerOrOptions === 'object' && 'onChange' in handlerOrOptions) {
            const handler = handlerOrOptions;
            const options = maybeOptions;
            return this.onChangeWithCallback(handler, options);
        }
        const options = handlerOrOptions;
        return this.onChangeWithAsyncGenerator(options);
    }
    /**
     * Invoke the provided callback on any changes to any of the specified tables.
     *
     * This is preferred over {@link watchWithCallback} when multiple queries need to be performed
     * together when data is changed.
     *
     * Note that the `onChange` callback member of the handler is required.
     *
     * @param handler Callbacks for handling change events and errors
     * @param options Options for configuring watch behavior
     * @returns A dispose function to stop watching for changes
     */
    onChangeWithCallback(handler, options) {
        const { onChange, onError = (e) => this.logger.error(e) } = handler ?? {};
        if (!onChange) {
            throw new Error('onChange is required');
        }
        const resolvedOptions = options ?? {};
        const watchedTables = new Set((resolvedOptions?.tables ?? []).flatMap((table) => [table, `ps_data__${table}`, `ps_data_local__${table}`]));
        const changedTables = new Set();
        const throttleMs = resolvedOptions.throttleMs ?? DEFAULT_WATCH_THROTTLE_MS;
        const executor = new ControlledExecutor(async (e) => {
            await onChange(e);
        });
        const flushTableUpdates = throttleTrailing(() => this.handleTableChanges(changedTables, watchedTables, (intersection) => {
            if (resolvedOptions?.signal?.aborted)
                return;
            executor.schedule({ changedTables: intersection });
        }), throttleMs);
        if (options?.triggerImmediate) {
            executor.schedule({ changedTables: [] });
        }
        const dispose = this.database.registerListener({
            tablesUpdated: async (update) => {
                try {
                    this.processTableUpdates(update, changedTables);
                    flushTableUpdates();
                }
                catch (error) {
                    onError?.(error);
                }
            }
        });
        resolvedOptions.signal?.addEventListener('abort', () => {
            executor.dispose();
            dispose();
        });
        return () => dispose();
    }
    /**
     * Create a Stream of changes to any of the specified tables.
     *
     * This is preferred over {@link watchWithAsyncGenerator} when multiple queries need to be performed
     * together when data is changed.
     *
     * Note: do not declare this as `async *onChange` as it will not work in React Native.
     *
     * @param options Options for configuring watch behavior
     * @returns An AsyncIterable that yields change events whenever the specified tables change
     */
    onChangeWithAsyncGenerator(options) {
        const resolvedOptions = options ?? {};
        return new domExports.EventIterator((eventOptions) => {
            const dispose = this.onChangeWithCallback({
                onChange: (event) => {
                    eventOptions.push(event);
                },
                onError: (error) => {
                    eventOptions.fail(error);
                }
            }, options);
            resolvedOptions.signal?.addEventListener('abort', () => {
                eventOptions.stop();
                // Maybe fail?
            });
            return () => dispose();
        });
    }
    handleTableChanges(changedTables, watchedTables, onDetectedChanges) {
        if (changedTables.size > 0) {
            const intersection = Array.from(changedTables.values()).filter((change) => watchedTables.has(change));
            if (intersection.length) {
                onDetectedChanges(intersection);
            }
        }
        changedTables.clear();
    }
    processTableUpdates(updateNotification, changedTables) {
        const tables = isBatchedUpdateNotification(updateNotification)
            ? updateNotification.tables
            : [updateNotification.table];
        for (const table of tables) {
            changedTables.add(table);
        }
    }
    /**
     * @ignore
     */
    async executeReadOnly(sql, params) {
        await this.waitForReady();
        return this.database.readLock((tx) => tx.execute(sql, params));
    }
}

class AbstractPowerSyncDatabaseOpenFactory {
    options;
    constructor(options) {
        this.options = options;
        options.logger = options.logger ?? Logger.get(`PowerSync ${this.options.dbFilename}`);
    }
    /**
     * Schema used for the local database.
     */
    get schema() {
        return this.options.schema;
    }
    generateOptions() {
        return {
            database: this.openDB(),
            ...this.options
        };
    }
    getInstance() {
        const options = this.generateOptions();
        return this.generateInstance(options);
    }
}

function runOnSchemaChange(callback, db, options) {
    const triggerWatchedQuery = () => {
        const abortController = new AbortController();
        let disposeSchemaListener = null;
        const stopWatching = () => {
            abortController.abort('Abort triggered');
            disposeSchemaListener?.();
            disposeSchemaListener = null;
            // Stop listening to upstream abort for this watch
            options?.signal?.removeEventListener('abort', stopWatching);
        };
        options?.signal?.addEventListener('abort', stopWatching);
        disposeSchemaListener = db.registerListener({
            schemaChanged: async () => {
                stopWatching();
                // Re trigger the watched query (recursively), setTimeout ensures that we don't modify the list of listeners while iterating through them
                setTimeout(() => triggerWatchedQuery(), 0);
            }
        });
        callback(abortController.signal);
    };
    triggerWatchedQuery();
}

function compilableQueryWatch(db, query, handler, options) {
    const { onResult, onError = (e) => { } } = handler ?? {};
    if (!onResult) {
        throw new Error('onResult is required');
    }
    const watchQuery = async (abortSignal) => {
        try {
            const toSql = query.compile();
            const resolvedTables = await db.resolveTables(toSql.sql, toSql.parameters, options);
            // Fetch initial data
            const result = await query.execute();
            onResult(result);
            db.onChangeWithCallback({
                onChange: async () => {
                    try {
                        const result = await query.execute();
                        onResult(result);
                    }
                    catch (error) {
                        onError(error);
                    }
                },
                onError
            }, {
                ...(options ?? {}),
                tables: resolvedTables,
                // Override the abort signal since we intercept it
                signal: abortSignal
            });
        }
        catch (error) {
            onError(error);
        }
    };
    runOnSchemaChange(watchQuery, db, options);
}

const MAX_OP_ID = '9223372036854775807';

class SqliteBucketStorage extends BaseObserver {
    db;
    logger;
    tableNames;
    _hasCompletedSync;
    updateListener;
    _clientId;
    constructor(db, logger = Logger.get('SqliteBucketStorage')) {
        super();
        this.db = db;
        this.logger = logger;
        this._hasCompletedSync = false;
        this.tableNames = new Set();
        this.updateListener = db.registerListener({
            tablesUpdated: (update) => {
                const tables = extractTableUpdates(update);
                if (tables.includes(PSInternalTable.CRUD)) {
                    this.iterateListeners((l) => l.crudUpdate?.());
                }
            }
        });
    }
    async init() {
        this._hasCompletedSync = false;
        const existingTableRows = await this.db.getAll(`SELECT name FROM sqlite_master WHERE type='table' AND name GLOB 'ps_data_*'`);
        for (const row of existingTableRows ?? []) {
            this.tableNames.add(row.name);
        }
    }
    async dispose() {
        this.updateListener?.();
    }
    async _getClientId() {
        const row = await this.db.get('SELECT powersync_client_id() as client_id');
        return row['client_id'];
    }
    getClientId() {
        if (this._clientId == null) {
            this._clientId = this._getClientId();
        }
        return this._clientId;
    }
    getMaxOpId() {
        return MAX_OP_ID;
    }
    /**
     * Reset any caches.
     */
    startSession() { }
    async getBucketStates() {
        const result = await this.db.getAll("SELECT name as bucket, cast(last_op as TEXT) as op_id FROM ps_buckets WHERE pending_delete = 0 AND name != '$local'");
        return result;
    }
    async getBucketOperationProgress() {
        const rows = await this.db.getAll('SELECT name, count_at_last, count_since_last FROM ps_buckets');
        return Object.fromEntries(rows.map((r) => [r.name, { atLast: r.count_at_last, sinceLast: r.count_since_last }]));
    }
    async saveSyncData(batch, fixedKeyFormat = false) {
        await this.writeTransaction(async (tx) => {
            for (const b of batch.buckets) {
                await tx.execute('INSERT INTO powersync_operations(op, data) VALUES(?, ?)', [
                    'save',
                    JSON.stringify({ buckets: [b.toJSON(fixedKeyFormat)] })
                ]);
                this.logger.debug(`Saved batch of data for  bucket: ${b.bucket}, operations: ${b.data.length}`);
            }
        });
    }
    async removeBuckets(buckets) {
        for (const bucket of buckets) {
            await this.deleteBucket(bucket);
        }
    }
    /**
     * Mark a bucket for deletion.
     */
    async deleteBucket(bucket) {
        await this.writeTransaction(async (tx) => {
            await tx.execute('INSERT INTO powersync_operations(op, data) VALUES(?, ?)', ['delete_bucket', bucket]);
        });
        this.logger.debug(`Done deleting bucket ${bucket}`);
    }
    async hasCompletedSync() {
        if (this._hasCompletedSync) {
            return true;
        }
        const r = await this.db.get(`SELECT powersync_last_synced_at() as synced_at`);
        const completed = r.synced_at != null;
        if (completed) {
            this._hasCompletedSync = true;
        }
        return completed;
    }
    async syncLocalDatabase(checkpoint, priority) {
        const r = await this.validateChecksums(checkpoint, priority);
        if (!r.checkpointValid) {
            this.logger.error('Checksums failed for', r.checkpointFailures);
            for (const b of r.checkpointFailures ?? []) {
                await this.deleteBucket(b);
            }
            return { ready: false, checkpointValid: false, checkpointFailures: r.checkpointFailures };
        }
        if (priority == null) {
            this.logger.debug(`Validated checksums checkpoint ${checkpoint.last_op_id}`);
        }
        else {
            this.logger.debug(`Validated checksums for partial checkpoint ${checkpoint.last_op_id}, priority ${priority}`);
        }
        let buckets = checkpoint.buckets;
        if (priority !== undefined) {
            buckets = buckets.filter((b) => hasMatchingPriority(priority, b));
        }
        const bucketNames = buckets.map((b) => b.bucket);
        await this.writeTransaction(async (tx) => {
            await tx.execute(`UPDATE ps_buckets SET last_op = ? WHERE name IN (SELECT json_each.value FROM json_each(?))`, [
                checkpoint.last_op_id,
                JSON.stringify(bucketNames)
            ]);
            if (priority == null && checkpoint.write_checkpoint) {
                await tx.execute("UPDATE ps_buckets SET last_op = ? WHERE name = '$local'", [checkpoint.write_checkpoint]);
            }
        });
        const valid = await this.updateObjectsFromBuckets(checkpoint, priority);
        if (!valid) {
            return { ready: false, checkpointValid: true };
        }
        return {
            ready: true,
            checkpointValid: true
        };
    }
    /**
     * Atomically update the local state to the current checkpoint.
     *
     * This includes creating new tables, dropping old tables, and copying data over from the oplog.
     */
    async updateObjectsFromBuckets(checkpoint, priority) {
        let arg = '';
        if (priority !== undefined) {
            const affectedBuckets = [];
            for (const desc of checkpoint.buckets) {
                if (hasMatchingPriority(priority, desc)) {
                    affectedBuckets.push(desc.bucket);
                }
            }
            arg = JSON.stringify({ priority, buckets: affectedBuckets });
        }
        return this.writeTransaction(async (tx) => {
            const { insertId: result } = await tx.execute('INSERT INTO powersync_operations(op, data) VALUES(?, ?)', [
                'sync_local',
                arg
            ]);
            if (result == 1) {
                if (priority == null) {
                    const bucketToCount = Object.fromEntries(checkpoint.buckets.map((b) => [b.bucket, b.count]));
                    // The two parameters could be replaced with one, but: https://github.com/powersync-ja/better-sqlite3/pull/6
                    const jsonBucketCount = JSON.stringify(bucketToCount);
                    await tx.execute("UPDATE ps_buckets SET count_since_last = 0, count_at_last = ?->name WHERE name != '$local' AND ?->name IS NOT NULL", [jsonBucketCount, jsonBucketCount]);
                }
                return true;
            }
            else {
                return false;
            }
        });
    }
    async validateChecksums(checkpoint, priority) {
        if (priority !== undefined) {
            // Only validate the buckets within the priority we care about
            const newBuckets = checkpoint.buckets.filter((cs) => hasMatchingPriority(priority, cs));
            checkpoint = { ...checkpoint, buckets: newBuckets };
        }
        const rs = await this.db.execute('SELECT powersync_validate_checkpoint(?) as result', [
            JSON.stringify({ ...checkpoint })
        ]);
        const resultItem = rs.rows?.item(0);
        if (!resultItem) {
            return {
                checkpointValid: false,
                ready: false,
                checkpointFailures: []
            };
        }
        const result = JSON.parse(resultItem['result']);
        if (result['valid']) {
            return { ready: true, checkpointValid: true };
        }
        else {
            return {
                checkpointValid: false,
                ready: false,
                checkpointFailures: result['failed_buckets']
            };
        }
    }
    async updateLocalTarget(cb) {
        const rs1 = await this.db.getAll("SELECT target_op FROM ps_buckets WHERE name = '$local' AND target_op = CAST(? as INTEGER)", [MAX_OP_ID]);
        if (!rs1.length) {
            // Nothing to update
            return false;
        }
        const rs = await this.db.getAll("SELECT seq FROM main.sqlite_sequence WHERE name = 'ps_crud'");
        if (!rs.length) {
            // Nothing to update
            return false;
        }
        const seqBefore = rs[0]['seq'];
        const opId = await cb();
        return this.writeTransaction(async (tx) => {
            const anyData = await tx.execute('SELECT 1 FROM ps_crud LIMIT 1');
            if (anyData.rows?.length) {
                // if isNotEmpty
                this.logger.debug(`New data uploaded since write checkpoint ${opId} - need new write checkpoint`);
                return false;
            }
            const rs = await tx.execute("SELECT seq FROM main.sqlite_sequence WHERE name = 'ps_crud'");
            if (!rs.rows?.length) {
                // assert isNotEmpty
                throw new Error('SQLite Sequence should not be empty');
            }
            const seqAfter = rs.rows?.item(0)['seq'];
            if (seqAfter != seqBefore) {
                this.logger.debug(`New data uploaded since write checpoint ${opId} - need new write checkpoint (sequence updated)`);
                // New crud data may have been uploaded since we got the checkpoint. Abort.
                return false;
            }
            this.logger.debug(`Updating target write checkpoint to ${opId}`);
            await tx.execute("UPDATE ps_buckets SET target_op = CAST(? as INTEGER) WHERE name='$local'", [opId]);
            return true;
        });
    }
    async nextCrudItem() {
        const next = await this.db.getOptional('SELECT * FROM ps_crud ORDER BY id ASC LIMIT 1');
        if (!next) {
            return;
        }
        return CrudEntry.fromRow(next);
    }
    async hasCrud() {
        const anyData = await this.db.getOptional('SELECT 1 FROM ps_crud LIMIT 1');
        return !!anyData;
    }
    /**
     * Get a batch of objects to send to the server.
     * When the objects are successfully sent to the server, call .complete()
     */
    async getCrudBatch(limit = 100) {
        if (!(await this.hasCrud())) {
            return null;
        }
        const crudResult = await this.db.getAll('SELECT * FROM ps_crud ORDER BY id ASC LIMIT ?', [limit]);
        const all = [];
        for (const row of crudResult) {
            all.push(CrudEntry.fromRow(row));
        }
        if (all.length === 0) {
            return null;
        }
        const last = all[all.length - 1];
        return {
            crud: all,
            haveMore: true,
            complete: async (writeCheckpoint) => {
                return this.writeTransaction(async (tx) => {
                    await tx.execute('DELETE FROM ps_crud WHERE id <= ?', [last.clientId]);
                    if (writeCheckpoint) {
                        const crudResult = await tx.execute('SELECT 1 FROM ps_crud LIMIT 1');
                        if (crudResult.rows?.length) {
                            await tx.execute("UPDATE ps_buckets SET target_op = CAST(? as INTEGER) WHERE name='$local'", [
                                writeCheckpoint
                            ]);
                        }
                    }
                    else {
                        await tx.execute("UPDATE ps_buckets SET target_op = CAST(? as INTEGER) WHERE name='$local'", [
                            this.getMaxOpId()
                        ]);
                    }
                });
            }
        };
    }
    async writeTransaction(callback, options) {
        return this.db.writeTransaction(callback, options);
    }
    /**
     * Set a target checkpoint.
     */
    async setTargetCheckpoint(checkpoint) {
        // No-op for now
    }
    async control(op, payload) {
        return await this.writeTransaction(async (tx) => {
            const [[raw]] = await tx.executeRaw('SELECT powersync_control(?, ?)', [op, payload]);
            return raw;
        });
    }
    async hasMigratedSubkeys() {
        const { r } = await this.db.get('SELECT EXISTS(SELECT * FROM ps_kv WHERE key = ?) as r', [
            SqliteBucketStorage._subkeyMigrationKey
        ]);
        return r != 0;
    }
    async migrateToFixedSubkeys() {
        await this.writeTransaction(async (tx) => {
            await tx.execute('UPDATE ps_oplog SET key = powersync_remove_duplicate_key_encoding(key);');
            await tx.execute('INSERT OR REPLACE INTO ps_kv (key, value) VALUES (?, ?);', [
                SqliteBucketStorage._subkeyMigrationKey,
                '1'
            ]);
        });
    }
    static _subkeyMigrationKey = 'powersync_js_migrated_subkeys';
}
function hasMatchingPriority(priority, bucket) {
    return bucket.priority != null && bucket.priority <= priority;
}

// TODO JSON
class SyncDataBatch {
    buckets;
    static fromJSON(json) {
        return new SyncDataBatch(json.buckets.map((bucket) => SyncDataBucket.fromRow(bucket)));
    }
    constructor(buckets) {
        this.buckets = buckets;
    }
}

/**
 * Thrown when an underlying database connection is closed.
 * This is particularly relevant when worker connections are marked as closed while
 * operations are still in progress.
 */
class ConnectionClosedError extends Error {
    static NAME = 'ConnectionClosedError';
    static MATCHES(input) {
        /**
         * If there are weird package issues which cause multiple versions of classes to be present, the instanceof
         * check might fail. This also performs a failsafe check.
         * This might also happen if the Error is serialized and parsed over a bridging channel like a MessagePort.
         */
        return (input instanceof ConnectionClosedError || (input instanceof Error && input.name == ConnectionClosedError.NAME));
    }
    constructor(message) {
        super(message);
        this.name = ConnectionClosedError.NAME;
    }
}

// https://www.sqlite.org/lang_expr.html#castexpr
var ColumnType;
(function (ColumnType) {
    ColumnType["TEXT"] = "TEXT";
    ColumnType["INTEGER"] = "INTEGER";
    ColumnType["REAL"] = "REAL";
})(ColumnType || (ColumnType = {}));
const text = {
    type: ColumnType.TEXT
};
const integer = {
    type: ColumnType.INTEGER
};
const real = {
    type: ColumnType.REAL
};
// powersync-sqlite-core limits the number of column per table to 1999, due to internal SQLite limits.
// In earlier versions this was limited to 63.
const MAX_AMOUNT_OF_COLUMNS = 1999;
const column = {
    text,
    integer,
    real
};
class Column {
    options;
    constructor(options) {
        this.options = options;
    }
    get name() {
        return this.options.name;
    }
    get type() {
        return this.options.type;
    }
    toJSON() {
        return {
            name: this.name,
            type: this.type
        };
    }
}

const DEFAULT_INDEX_COLUMN_OPTIONS = {
    ascending: true
};
class IndexedColumn {
    options;
    static createAscending(column) {
        return new IndexedColumn({
            name: column,
            ascending: true
        });
    }
    constructor(options) {
        this.options = { ...DEFAULT_INDEX_COLUMN_OPTIONS, ...options };
    }
    get name() {
        return this.options.name;
    }
    get ascending() {
        return this.options.ascending;
    }
    toJSON(table) {
        return {
            name: this.name,
            ascending: this.ascending,
            type: table.columns.find((column) => column.name === this.name)?.type ?? ColumnType.TEXT
        };
    }
}

const DEFAULT_INDEX_OPTIONS = {
    columns: []
};
class Index {
    options;
    static createAscending(options, columnNames) {
        return new Index({
            ...options,
            columns: columnNames.map((name) => IndexedColumn.createAscending(name))
        });
    }
    constructor(options) {
        this.options = options;
        this.options = { ...DEFAULT_INDEX_OPTIONS, ...options };
    }
    get name() {
        return this.options.name;
    }
    get columns() {
        return this.options.columns ?? [];
    }
    toJSON(table) {
        return {
            name: this.name,
            columns: this.columns.map((c) => c.toJSON(table))
        };
    }
}

/**
 * Instructs PowerSync to sync data into a "raw" table.
 *
 * Since raw tables are not backed by JSON, running complex queries on them may be more efficient. Further, they allow
 * using client-side table and column constraints.
 *
 * To collect local writes to raw tables with PowerSync, custom triggers are required. See
 * {@link https://docs.powersync.com/usage/use-case-examples/raw-tables the documentation} for details and an example on
 * using raw tables.
 *
 * Note that raw tables are only supported when using the new `SyncClientImplementation.rust` sync client.
 *
 * @experimental Please note that this feature is experimental at the moment, and not covered by PowerSync semver or
 * stability guarantees.
 */
class RawTable {
    /**
     * The name of the table.
     *
     * This does not have to match the actual table name in the schema - {@link put} and {@link delete} are free to use
     * another table. Instead, this name is used by the sync client to recognize that operations on this table (as it
     * appears in the source / backend database) are to be handled specially.
     */
    name;
    put;
    delete;
    constructor(name, type) {
        this.name = name;
        this.put = type.put;
        this.delete = type.delete;
    }
}

/**
 * A schema is a collection of tables. It is used to define the structure of a database.
 */
class Schema {
    /*
      Only available when constructing with mapped typed definition columns
    */
    types;
    props;
    tables;
    rawTables;
    constructor(tables) {
        if (Array.isArray(tables)) {
            /*
              We need to validate that the tables have a name here because a user could pass in an array
              of Tables that don't have a name because they are using the V2 syntax.
              Therefore, 'convertToClassicTables' won't be called on the tables resulting in a runtime error.
            */
            for (const table of tables) {
                if (table.name === '') {
                    throw new Error("It appears you are trying to create a new Schema with an array instead of an object. Passing in an object instead of an array into 'new Schema()' may resolve your issue.");
                }
            }
            this.tables = tables;
        }
        else {
            // Update the table entries with the provided table name key
            this.props = Object.fromEntries(Object.entries(tables).map(([tableName, table]) => [tableName, table.copyWithName(tableName)]));
            this.tables = Object.values(this.props);
        }
        this.rawTables = [];
    }
    /**
     * Adds raw tables to this schema. Raw tables are identified by their name, but entirely managed by the application
     * developer instead of automatically by PowerSync.
     * Since raw tables are not backed by JSON, running complex queries on them may be more efficient. Further, they allow
     * using client-side table and column constraints.
     * Note that raw tables are only supported when using the new `SyncClientImplementation.rust` sync client.
     *
     * @param tables An object of (table name, raw table definition) entries.
     * @experimental Note that the raw tables API is still experimental and may change in the future.
     */
    withRawTables(tables) {
        for (const [name, rawTableDefinition] of Object.entries(tables)) {
            this.rawTables.push(new RawTable(name, rawTableDefinition));
        }
    }
    validate() {
        for (const table of this.tables) {
            table.validate();
        }
    }
    toJSON() {
        return {
            tables: this.tables.map((t) => t.toJSON()),
            raw_tables: this.rawTables
        };
    }
}

const DEFAULT_TABLE_OPTIONS = {
    indexes: [],
    insertOnly: false,
    localOnly: false,
    trackPrevious: false,
    trackMetadata: false,
    ignoreEmptyUpdates: false
};
const InvalidSQLCharacters = /["'%,.#\s[\]]/;
class Table {
    options;
    _mappedColumns;
    static createLocalOnly(options) {
        return new Table({ ...options, localOnly: true, insertOnly: false });
    }
    static createInsertOnly(options) {
        return new Table({ ...options, localOnly: false, insertOnly: true });
    }
    /**
     * Create a table.
     * @deprecated This was only only included for TableV2 and is no longer necessary.
     * Prefer to use new Table() directly.
     *
     * TODO remove in the next major release.
     */
    static createTable(name, table) {
        return new Table({
            name,
            columns: table.columns,
            indexes: table.indexes,
            localOnly: table.options.localOnly,
            insertOnly: table.options.insertOnly,
            viewName: table.options.viewName
        });
    }
    constructor(optionsOrColumns, v2Options) {
        if (this.isTableV1(optionsOrColumns)) {
            this.initTableV1(optionsOrColumns);
        }
        else {
            this.initTableV2(optionsOrColumns, v2Options);
        }
    }
    copyWithName(name) {
        return new Table({
            ...this.options,
            name
        });
    }
    isTableV1(arg) {
        return 'columns' in arg && Array.isArray(arg.columns);
    }
    initTableV1(options) {
        this.options = {
            ...options,
            indexes: options.indexes || []
        };
        this.applyDefaultOptions();
    }
    initTableV2(columns, options) {
        const convertedColumns = Object.entries(columns).map(([name, columnInfo]) => new Column({ name, type: columnInfo.type }));
        const convertedIndexes = Object.entries(options?.indexes ?? {}).map(([name, columnNames]) => new Index({
            name,
            columns: columnNames.map((name) => new IndexedColumn({
                name: name.replace(/^-/, ''),
                ascending: !name.startsWith('-')
            }))
        }));
        this.options = {
            name: '',
            columns: convertedColumns,
            indexes: convertedIndexes,
            viewName: options?.viewName,
            insertOnly: options?.insertOnly,
            localOnly: options?.localOnly,
            trackPrevious: options?.trackPrevious,
            trackMetadata: options?.trackMetadata,
            ignoreEmptyUpdates: options?.ignoreEmptyUpdates
        };
        this.applyDefaultOptions();
        this._mappedColumns = columns;
    }
    applyDefaultOptions() {
        this.options.insertOnly ??= DEFAULT_TABLE_OPTIONS.insertOnly;
        this.options.localOnly ??= DEFAULT_TABLE_OPTIONS.localOnly;
        this.options.trackPrevious ??= DEFAULT_TABLE_OPTIONS.trackPrevious;
        this.options.trackMetadata ??= DEFAULT_TABLE_OPTIONS.trackMetadata;
        this.options.ignoreEmptyUpdates ??= DEFAULT_TABLE_OPTIONS.ignoreEmptyUpdates;
    }
    get name() {
        return this.options.name;
    }
    get viewNameOverride() {
        return this.options.viewName;
    }
    get viewName() {
        return this.viewNameOverride ?? this.name;
    }
    get columns() {
        return this.options.columns;
    }
    get columnMap() {
        return (this._mappedColumns ??
            this.columns.reduce((hash, column) => {
                hash[column.name] = { type: column.type ?? ColumnType.TEXT };
                return hash;
            }, {}));
    }
    get indexes() {
        return this.options.indexes ?? [];
    }
    get localOnly() {
        return this.options.localOnly;
    }
    get insertOnly() {
        return this.options.insertOnly;
    }
    get trackPrevious() {
        return this.options.trackPrevious;
    }
    get trackMetadata() {
        return this.options.trackMetadata;
    }
    get ignoreEmptyUpdates() {
        return this.options.ignoreEmptyUpdates;
    }
    get internalName() {
        if (this.options.localOnly) {
            return `ps_data_local__${this.name}`;
        }
        return `ps_data__${this.name}`;
    }
    get validName() {
        if (InvalidSQLCharacters.test(this.name)) {
            return false;
        }
        if (this.viewNameOverride != null && InvalidSQLCharacters.test(this.viewNameOverride)) {
            return false;
        }
        return true;
    }
    validate() {
        if (InvalidSQLCharacters.test(this.name)) {
            throw new Error(`Invalid characters in table name: ${this.name}`);
        }
        if (this.viewNameOverride && InvalidSQLCharacters.test(this.viewNameOverride)) {
            throw new Error(`Invalid characters in view name: ${this.viewNameOverride}`);
        }
        if (this.columns.length > MAX_AMOUNT_OF_COLUMNS) {
            throw new Error(`Table has too many columns. The maximum number of columns is ${MAX_AMOUNT_OF_COLUMNS}.`);
        }
        if (this.trackMetadata && this.localOnly) {
            throw new Error(`Can't include metadata for local-only tables.`);
        }
        if (this.trackPrevious != false && this.localOnly) {
            throw new Error(`Can't include old values for local-only tables.`);
        }
        const columnNames = new Set();
        columnNames.add('id');
        for (const column of this.columns) {
            const { name: columnName } = column;
            if (column.name === 'id') {
                throw new Error(`An id column is automatically added, custom id columns are not supported`);
            }
            if (columnNames.has(columnName)) {
                throw new Error(`Duplicate column ${columnName}`);
            }
            if (InvalidSQLCharacters.test(columnName)) {
                throw new Error(`Invalid characters in column name: ${column.name}`);
            }
            columnNames.add(columnName);
        }
        const indexNames = new Set();
        for (const index of this.indexes) {
            if (indexNames.has(index.name)) {
                throw new Error(`Duplicate index ${index.name}`);
            }
            if (InvalidSQLCharacters.test(index.name)) {
                throw new Error(`Invalid characters in index name: ${index.name}`);
            }
            for (const column of index.columns) {
                if (!columnNames.has(column.name)) {
                    throw new Error(`Column ${column.name} not found for index ${index.name}`);
                }
            }
            indexNames.add(index.name);
        }
    }
    toJSON() {
        const trackPrevious = this.trackPrevious;
        return {
            name: this.name,
            view_name: this.viewName,
            local_only: this.localOnly,
            insert_only: this.insertOnly,
            include_old: trackPrevious && (trackPrevious.columns ?? true),
            include_old_only_when_changed: typeof trackPrevious == 'object' && trackPrevious.onlyWhenChanged == true,
            include_metadata: this.trackMetadata,
            ignore_empty_update: this.ignoreEmptyUpdates,
            columns: this.columns.map((c) => c.toJSON()),
            indexes: this.indexes.map((e) => e.toJSON(this))
        };
    }
}

/**
  Generate a new table from the columns and indexes
  @deprecated You should use {@link Table} instead as it now allows TableV2 syntax.
  This will be removed in the next major release.
*/
class TableV2 extends Table {
}

function sanitizeString(input) {
    return `'${input.replace(/'/g, "''")}'`;
}
/**
 * Helper function for sanitizing UUID input strings.
 * Typically used with {@link sanitizeSQL}.
 */
function sanitizeUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isValid = uuidRegex.test(uuid);
    if (!isValid) {
        throw new Error(`${uuid} is not a valid UUID`);
    }
    return uuid;
}
/**
 * SQL string template function for {@link TrackDiffOptions#when} and {@link CreateDiffTriggerOptions#when}.
 *
 * This function performs basic string interpolation for SQLite WHEN clauses.
 *
 * **String placeholders:**
 * - All string values passed as placeholders are automatically wrapped in single quotes (`'`).
 * - Do not manually wrap placeholders in single quotes in your template string; the function will handle quoting and escaping for you.
 * - Any single quotes within the string value are escaped by doubling them (`''`), as required by SQL syntax.
 *
 * **Other types:**
 * - `null` and `undefined` are converted to SQL `NULL`.
 * - Objects are stringified using `JSON.stringify()` and wrapped in single quotes, with any single quotes inside the stringified value escaped.
 * - Numbers and other primitive types are inserted directly.
 *
 * **Usage example:**
 * ```typescript
 * const myID = "O'Reilly";
 * const clause = sanitizeSQL`New.id = ${myID}`;
 * // Result: "New.id = 'O''Reilly'"
 * ```
 *
 * Avoid manually quoting placeholders:
 * ```typescript
 * // Incorrect:
 * sanitizeSQL`New.id = '${myID}'` // Produces double quotes: New.id = ''O''Reilly''
 * ```
 */
function sanitizeSQL(strings, ...values) {
    let result = '';
    strings.forEach((str, i) => {
        result += str;
        if (i < values.length) {
            // For SQL, escape single quotes in string values
            const value = values[i];
            if (typeof value == 'string') {
                result += sanitizeString(value);
            }
            else if (value == null) {
                result += 'NULL';
            }
            else if (typeof value == 'object') {
                // Stringify the object and escape single quotes in the result
                const stringified = JSON.stringify(value);
                result += sanitizeString(stringified);
            }
            else {
                result += value;
            }
        }
    });
    return result;
}

/**
 * Performs a {@link AbstractPowerSyncDatabase.getAll} operation for a watched query.
 */
class GetAllQuery {
    options;
    constructor(options) {
        this.options = options;
    }
    compile() {
        return {
            sql: this.options.sql,
            parameters: this.options.parameters ?? []
        };
    }
    async execute(options) {
        const { db } = options;
        const { sql, parameters = [] } = this.compile();
        const rawResult = await db.getAll(sql, [...parameters]);
        if (this.options.mapper) {
            return rawResult.map(this.options.mapper);
        }
        return rawResult;
    }
}

const TypedLogger = Logger;
const LogLevel = {
    TRACE: TypedLogger.TRACE,
    DEBUG: TypedLogger.DEBUG,
    INFO: TypedLogger.INFO,
    TIME: TypedLogger.TIME,
    WARN: TypedLogger.WARN,
    ERROR: TypedLogger.ERROR,
    OFF: TypedLogger.OFF
};
/**
 * Retrieves the base (default) logger instance.
 *
 * This base logger controls the default logging configuration and is shared
 * across all loggers created with `createLogger`. Adjusting settings on this
 * base logger affects all loggers derived from it unless explicitly overridden.
 *
 */
function createBaseLogger() {
    return Logger;
}
/**
 * Creates and configures a new named logger based on the base logger.
 *
 * Named loggers allow specific modules or areas of your application to have
 * their own logging levels and behaviors. These loggers inherit configuration
 * from the base logger by default but can override settings independently.
 */
function createLogger(name, options = {}) {
    const logger = Logger.get(name);
    if (options.logLevel) {
        logger.setLevel(options.logLevel);
    }
    return logger;
}

const parseQuery = (query, parameters) => {
    let sqlStatement;
    if (typeof query == 'string') {
        sqlStatement = query;
    }
    else {
        const hasAdditionalParameters = parameters.length > 0;
        if (hasAdditionalParameters) {
            throw new Error('You cannot pass parameters to a compiled query.');
        }
        const compiled = query.compile();
        sqlStatement = compiled.sql;
        parameters = compiled.parameters;
    }
    return { sqlStatement, parameters: parameters };
};


//# sourceMappingURL=bundle.mjs.map


/***/ },

/***/ "./lib/src/db/adapters/LockedAsyncDatabaseAdapter.js"
/*!***********************************************************!*\
  !*** ./lib/src/db/adapters/LockedAsyncDatabaseAdapter.js ***!
  \***********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   LockedAsyncDatabaseAdapter: () => (/* binding */ LockedAsyncDatabaseAdapter)
/* harmony export */ });
/* harmony import */ var _powersync_common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @powersync/common */ "../common/dist/bundle.mjs");
/* harmony import */ var _shared_navigator__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../shared/navigator */ "./lib/src/shared/navigator.js");
/* harmony import */ var _WorkerWrappedAsyncDatabaseConnection__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./WorkerWrappedAsyncDatabaseConnection */ "./lib/src/db/adapters/WorkerWrappedAsyncDatabaseConnection.js");
/* harmony import */ var _wa_sqlite_WASQLiteConnection__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./wa-sqlite/WASQLiteConnection */ "./lib/src/db/adapters/wa-sqlite/WASQLiteConnection.js");




/**
 * @internal
 * Wraps a {@link AsyncDatabaseConnection} and provides exclusive locking functions in
 * order to implement {@link DBAdapter}.
 */
class LockedAsyncDatabaseAdapter extends _powersync_common__WEBPACK_IMPORTED_MODULE_0__.BaseObserver {
    options;
    logger;
    dbGetHelpers;
    debugMode;
    _dbIdentifier;
    initPromise;
    _db = null;
    _disposeTableChangeListener = null;
    _config = null;
    pendingAbortControllers;
    requiresHolds;
    databaseOpenPromise = null;
    closing;
    closed;
    constructor(options) {
        super();
        this.options = options;
        this._dbIdentifier = options.name;
        this.logger = options.logger ?? (0,_powersync_common__WEBPACK_IMPORTED_MODULE_0__.createLogger)(`LockedAsyncDatabaseAdapter - ${this._dbIdentifier}`);
        this.pendingAbortControllers = new Set();
        this.closed = false;
        this.closing = false;
        this.requiresHolds = null;
        // Set the name if provided. We can query for the name if not available yet
        this.debugMode = options.debugMode ?? false;
        if (this.debugMode) {
            const originalExecute = this._execute.bind(this);
            this._execute = async (sql, bindings) => {
                const start = performance.now();
                try {
                    const r = await originalExecute(sql, bindings);
                    performance.measure(`[SQL] ${sql}`, { start });
                    return r;
                }
                catch (e) {
                    performance.measure(`[SQL] [ERROR: ${e.message}] ${sql}`, { start });
                    throw e;
                }
            };
        }
        this.dbGetHelpers = this.generateDBHelpers({
            execute: (query, params) => this.acquireLock(() => this._execute(query, params)),
            executeRaw: (query, params) => this.acquireLock(() => this._executeRaw(query, params))
        });
        this.initPromise = this._init();
    }
    get baseDB() {
        if (!this._db) {
            throw new Error(`Initialization has not completed yet. Cannot access base db`);
        }
        return this._db;
    }
    get name() {
        return this._dbIdentifier;
    }
    /**
     * Init is automatic, this helps catch errors or explicitly await initialization
     */
    async init() {
        return this.initPromise;
    }
    async openInternalDB() {
        /**
         * Execute opening of the db in a lock in order not to interfere with other operations.
         */
        return this._acquireLock(async () => {
            // Dispose any previous table change listener.
            this._disposeTableChangeListener?.();
            this._disposeTableChangeListener = null;
            this._db?.close().catch((ex) => this.logger.warn(`Error closing database before opening new instance`, ex));
            const isReOpen = !!this._db;
            this._db = null;
            this._db = await this.options.openConnection();
            await this._db.init();
            this._config = await this._db.getConfig();
            await this.registerOnChangeListener(this._db);
            if (isReOpen) {
                this.iterateListeners((cb) => cb.databaseReOpened?.());
            }
            /**
             * This is only required for the long-lived shared IndexedDB connections.
             */
            this.requiresHolds = this._config.vfs == _wa_sqlite_WASQLiteConnection__WEBPACK_IMPORTED_MODULE_3__.WASQLiteVFS.IDBBatchAtomicVFS;
        });
    }
    _reOpen() {
        this.databaseOpenPromise = this.openInternalDB().finally(() => {
            this.databaseOpenPromise = null;
        });
        return this.databaseOpenPromise;
    }
    /**
     * Re-opens the underlying database.
     * Returns a pending operation if one is already in progress.
     */
    async reOpenInternalDB() {
        if (!this.options.reOpenOnConnectionClosed) {
            throw new Error(`Cannot re-open underlying database, reOpenOnConnectionClosed is not enabled`);
        }
        if (this.databaseOpenPromise) {
            return this.databaseOpenPromise;
        }
        return this._reOpen();
    }
    async _init() {
        /**
         * For OPFS, we can see this open call sometimes fail due to NoModificationAllowedError.
         * We should be able to recover from this by re-opening the database.
         */
        const maxAttempts = 3;
        for (let count = 0; count < maxAttempts; count++) {
            try {
                await this.openInternalDB();
                break;
            }
            catch (ex) {
                if (count == maxAttempts - 1) {
                    throw ex;
                }
                this.logger.warn(`Attempt ${count + 1} of ${maxAttempts} to open database failed, retrying in 1 second...`, ex);
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }
        this.iterateListeners((cb) => cb.initialized?.());
    }
    getConfiguration() {
        if (!this._config) {
            throw new Error(`Cannot get config before initialization is completed`);
        }
        return this._config;
    }
    async waitForInitialized() {
        // Awaiting this will expose errors on function calls like .execute etc
        await this.initPromise;
    }
    async shareConnection() {
        if (false == this._db instanceof _WorkerWrappedAsyncDatabaseConnection__WEBPACK_IMPORTED_MODULE_2__.WorkerWrappedAsyncDatabaseConnection) {
            throw new Error(`Only worker connections can be shared`);
        }
        return this._db.shareConnection();
    }
    /**
     * Registers a table change notification callback with the base database.
     * This can be extended by custom implementations in order to handle proxy events.
     */
    async registerOnChangeListener(db) {
        this._disposeTableChangeListener = await db.registerOnTableChange((event) => {
            this.iterateListeners((cb) => cb.tablesUpdated?.(event));
        });
    }
    /**
     * This is currently a no-op on web
     */
    async refreshSchema() { }
    async execute(query, params) {
        return this.writeLock((ctx) => ctx.execute(query, params));
    }
    async executeRaw(query, params) {
        return this.writeLock((ctx) => ctx.executeRaw(query, params));
    }
    async executeBatch(query, params) {
        return this.writeLock((ctx) => this._executeBatch(query, params));
    }
    /**
     * Attempts to close the connection.
     * Shared workers might not actually close the connection if other
     * tabs are still using it.
     */
    async close() {
        this.closing = true;
        /**
         * Note that we obtain a reference to the callback to avoid calling the callback with `this` as the context.
         * This is to avoid Comlink attempting to clone `this` when calling the method.
         */
        const dispose = this._disposeTableChangeListener;
        if (dispose) {
            dispose();
        }
        this.pendingAbortControllers.forEach((controller) => controller.abort('Closed'));
        await this.baseDB?.close?.();
        this.closed = true;
    }
    async getAll(sql, parameters) {
        await this.waitForInitialized();
        return this.dbGetHelpers.getAll(sql, parameters);
    }
    async getOptional(sql, parameters) {
        await this.waitForInitialized();
        return this.dbGetHelpers.getOptional(sql, parameters);
    }
    async get(sql, parameters) {
        await this.waitForInitialized();
        return this.dbGetHelpers.get(sql, parameters);
    }
    async readLock(fn, options) {
        await this.waitForInitialized();
        return this.acquireLock(async () => fn(this.generateDBHelpers({ execute: this._execute, executeRaw: this._executeRaw })), {
            timeoutMs: options?.timeoutMs ?? this.options.defaultLockTimeoutMs
        });
    }
    async writeLock(fn, options) {
        await this.waitForInitialized();
        return this.acquireLock(async () => fn(this.generateDBHelpers({ execute: this._execute, executeRaw: this._executeRaw })), {
            timeoutMs: options?.timeoutMs ?? this.options.defaultLockTimeoutMs
        });
    }
    async _acquireLock(callback, options) {
        if (this.closing) {
            throw new Error(`Cannot acquire lock, the database is closing`);
        }
        const abortController = new AbortController();
        this.pendingAbortControllers.add(abortController);
        const { timeoutMs } = options ?? {};
        const timeoutId = timeoutMs
            ? setTimeout(() => {
                abortController.abort(`Timeout after ${timeoutMs}ms`);
                this.pendingAbortControllers.delete(abortController);
            }, timeoutMs)
            : null;
        return (0,_shared_navigator__WEBPACK_IMPORTED_MODULE_1__.getNavigatorLocks)().request(`db-lock-${this._dbIdentifier}`, { signal: abortController.signal }, async () => {
            this.pendingAbortControllers.delete(abortController);
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            return await callback();
        });
    }
    async acquireLock(callback, options) {
        await this.waitForInitialized();
        // The database is being opened in the background. Wait for it here.
        if (this.databaseOpenPromise) {
            await this.databaseOpenPromise;
        }
        return this._acquireLock(async () => {
            let holdId = null;
            try {
                /**
                 * We can't await this since it uses the same lock as we're in now.
                 * If there is a pending open, this call will throw.
                 * If there is no pending open, but there is also no database - the open
                 * might have failed. We need to re-open the database.
                 */
                if (this.databaseOpenPromise || !this._db) {
                    throw new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.ConnectionClosedError('Connection is busy re-opening');
                }
                holdId = this.requiresHolds ? await this.baseDB.markHold() : null;
                return await callback();
            }
            catch (ex) {
                if (_powersync_common__WEBPACK_IMPORTED_MODULE_0__.ConnectionClosedError.MATCHES(ex)) {
                    if (this.options.reOpenOnConnectionClosed && !this.databaseOpenPromise && !this.closing) {
                        // Immediately re-open the database. We need to miss as little table updates as possible.
                        // Note, don't await this since it uses the same lock as we're in now.
                        this.reOpenInternalDB();
                    }
                }
                throw ex;
            }
            finally {
                if (holdId) {
                    await this.baseDB.releaseHold(holdId);
                }
            }
        }, options);
    }
    async readTransaction(fn, options) {
        return this.readLock(this.wrapTransaction(fn));
    }
    writeTransaction(fn, options) {
        return this.writeLock(this.wrapTransaction(fn, true));
    }
    generateDBHelpers(tx) {
        return {
            ...tx,
            /**
             *  Execute a read-only query and return results
             */
            async getAll(sql, parameters) {
                const res = await tx.execute(sql, parameters);
                return res.rows?._array ?? [];
            },
            /**
             * Execute a read-only query and return the first result, or null if the ResultSet is empty.
             */
            async getOptional(sql, parameters) {
                const res = await tx.execute(sql, parameters);
                return res.rows?.item(0) ?? null;
            },
            /**
             * Execute a read-only query and return the first result, error if the ResultSet is empty.
             */
            async get(sql, parameters) {
                const res = await tx.execute(sql, parameters);
                const first = res.rows?.item(0);
                if (!first) {
                    throw new Error('Result set is empty');
                }
                return first;
            }
        };
    }
    /**
     * Wraps a lock context into a transaction context
     */
    wrapTransaction(cb, write = false) {
        return async (tx) => {
            await this._execute(write ? 'BEGIN EXCLUSIVE' : 'BEGIN');
            let finalized = false;
            const commit = async () => {
                if (finalized) {
                    return { rowsAffected: 0 };
                }
                finalized = true;
                return this._execute('COMMIT');
            };
            const rollback = () => {
                finalized = true;
                return this._execute('ROLLBACK');
            };
            try {
                const result = await cb({
                    ...tx,
                    commit,
                    rollback
                });
                if (!finalized) {
                    await commit();
                }
                return result;
            }
            catch (ex) {
                this.logger.debug('Caught ex in transaction', ex);
                try {
                    await rollback();
                }
                catch (ex2) {
                    // In rare cases, a rollback may fail.
                    // Safe to ignore.
                }
                throw ex;
            }
        };
    }
    /**
     * Wraps the worker execute function, awaiting for it to be available
     */
    _execute = async (sql, bindings) => {
        await this.waitForInitialized();
        const result = await this.baseDB.execute(sql, bindings);
        return {
            ...result,
            rows: {
                ...result.rows,
                item: (idx) => result.rows._array[idx]
            }
        };
    };
    /**
     * Wraps the worker executeRaw function, awaiting for it to be available
     */
    _executeRaw = async (sql, bindings) => {
        await this.waitForInitialized();
        return await this.baseDB.executeRaw(sql, bindings);
    };
    /**
     * Wraps the worker executeBatch function, awaiting for it to be available
     */
    _executeBatch = async (query, params) => {
        await this.waitForInitialized();
        const result = await this.baseDB.executeBatch(query, params);
        return {
            ...result,
            rows: undefined
        };
    };
}


/***/ },

/***/ "./lib/src/db/adapters/WorkerWrappedAsyncDatabaseConnection.js"
/*!*********************************************************************!*\
  !*** ./lib/src/db/adapters/WorkerWrappedAsyncDatabaseConnection.js ***!
  \*********************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   WorkerWrappedAsyncDatabaseConnection: () => (/* binding */ WorkerWrappedAsyncDatabaseConnection)
/* harmony export */ });
/* harmony import */ var _powersync_common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @powersync/common */ "../common/dist/bundle.mjs");
/* harmony import */ var comlink__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! comlink */ "../../node_modules/comlink/dist/esm/comlink.mjs");


/**
 * Wraps a provided instance of {@link AsyncDatabaseConnection}, providing necessary proxy
 * functions for worker listeners.
 */
class WorkerWrappedAsyncDatabaseConnection extends _powersync_common__WEBPACK_IMPORTED_MODULE_0__.BaseObserver {
    options;
    lockAbortController = new AbortController();
    notifyRemoteClosed;
    constructor(options) {
        super();
        this.options = options;
        if (options.remoteCanCloseUnexpectedly) {
            this.notifyRemoteClosed = new AbortController();
        }
    }
    get baseConnection() {
        return this.options.baseConnection;
    }
    init() {
        return this.baseConnection.init();
    }
    /**
     * Marks the remote as closed.
     *
     * This can sometimes happen outside of our control, e.g. when a shared worker requests a connection from a tab. When
     * it happens, all methods on the {@link baseConnection} would never resolve. To avoid livelocks in this scenario, we
     * throw on all outstanding promises and forbid new calls.
     */
    markRemoteClosed() {
        // Can non-null assert here because this function is only supposed to be called when remoteCanCloseUnexpectedly was
        // set.
        this.notifyRemoteClosed.abort();
    }
    markHold() {
        return this.withRemote(() => this.baseConnection.markHold());
    }
    releaseHold(holdId) {
        return this.withRemote(() => this.baseConnection.releaseHold(holdId));
    }
    isAutoCommit() {
        return this.withRemote(() => this.baseConnection.isAutoCommit());
    }
    withRemote(workerPromise, fireActionOnAbort = false) {
        const controller = this.notifyRemoteClosed;
        if (controller) {
            return new Promise((resolve, reject) => {
                if (controller.signal.aborted) {
                    reject(new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.ConnectionClosedError('Called operation on closed remote'));
                    if (!fireActionOnAbort) {
                        // Don't run the operation if we're going to reject
                        // We might want to fire-and-forget the operation in some cases (like a close operation)
                        return;
                    }
                }
                function handleAbort() {
                    reject(new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.ConnectionClosedError('Remote peer closed with request in flight'));
                }
                function completePromise(action) {
                    controller.signal.removeEventListener('abort', handleAbort);
                    action();
                }
                controller.signal.addEventListener('abort', handleAbort);
                workerPromise()
                    .then((data) => completePromise(() => resolve(data)))
                    .catch((e) => completePromise(() => reject(e)));
            });
        }
        else {
            // Can't close, so just return the inner worker promise unguarded.
            return workerPromise();
        }
    }
    /**
     * Get a MessagePort which can be used to share the internals of this connection.
     */
    async shareConnection() {
        const { identifier, remote } = this.options;
        /**
         * Hold a navigator lock in order to avoid features such as Chrome's frozen tabs,
         * or Edge's sleeping tabs from pausing the thread for this connection.
         * This promise resolves once a lock is obtained.
         * This lock will be held as long as this connection is open.
         * The `shareConnection` method should not be called on multiple tabs concurrently.
         */
        await new Promise((resolve, reject) => navigator.locks
            .request(`shared-connection-${this.options.identifier}-${Date.now()}-${Math.round(Math.random() * 10000)}`, {
            signal: this.lockAbortController.signal
        }, async () => {
            resolve();
            // Free the lock when the connection is already closed.
            if (this.lockAbortController.signal.aborted) {
                return;
            }
            // Hold the lock while the shared connection is in use.
            await new Promise((releaseLock) => {
                this.lockAbortController.signal.addEventListener('abort', () => {
                    releaseLock();
                });
            });
        })
            // We aren't concerned with abort errors here
            .catch((ex) => {
            if (ex.name == 'AbortError') {
                resolve();
            }
            else {
                reject(ex);
            }
        }));
        const newPort = await remote[comlink__WEBPACK_IMPORTED_MODULE_1__.createEndpoint]();
        return { port: newPort, identifier };
    }
    /**
     * Registers a table change notification callback with the base database.
     * This can be extended by custom implementations in order to handle proxy events.
     */
    async registerOnTableChange(callback) {
        return this.baseConnection.registerOnTableChange(comlink__WEBPACK_IMPORTED_MODULE_1__.proxy(callback));
    }
    async close() {
        // Abort any pending lock requests.
        this.lockAbortController.abort();
        try {
            // fire and forget the close operation
            await this.withRemote(() => this.baseConnection.close(), true);
        }
        finally {
            this.options.remote[comlink__WEBPACK_IMPORTED_MODULE_1__.releaseProxy]();
            this.options.onClose?.();
            this.iterateListeners((l) => l.closing?.());
        }
    }
    execute(sql, params) {
        return this.withRemote(() => this.baseConnection.execute(sql, params));
    }
    executeRaw(sql, params) {
        return this.withRemote(() => this.baseConnection.executeRaw(sql, params));
    }
    executeBatch(sql, params) {
        return this.withRemote(() => this.baseConnection.executeBatch(sql, params));
    }
    getConfig() {
        return this.withRemote(() => this.baseConnection.getConfig());
    }
}


/***/ },

/***/ "./lib/src/db/adapters/wa-sqlite/WASQLiteConnection.js"
/*!*************************************************************!*\
  !*** ./lib/src/db/adapters/wa-sqlite/WASQLiteConnection.js ***!
  \*************************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   AsyncWASQLiteModuleFactory: () => (/* binding */ AsyncWASQLiteModuleFactory),
/* harmony export */   DEFAULT_MODULE_FACTORIES: () => (/* binding */ DEFAULT_MODULE_FACTORIES),
/* harmony export */   MultiCipherAsyncWASQLiteModuleFactory: () => (/* binding */ MultiCipherAsyncWASQLiteModuleFactory),
/* harmony export */   MultiCipherSyncWASQLiteModuleFactory: () => (/* binding */ MultiCipherSyncWASQLiteModuleFactory),
/* harmony export */   SyncWASQLiteModuleFactory: () => (/* binding */ SyncWASQLiteModuleFactory),
/* harmony export */   WASQLiteVFS: () => (/* binding */ WASQLiteVFS),
/* harmony export */   WASqliteConnection: () => (/* binding */ WASqliteConnection)
/* harmony export */ });
/* harmony import */ var _journeyapps_wa_sqlite__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @journeyapps/wa-sqlite */ "../../node_modules/@journeyapps/wa-sqlite/src/sqlite-api.js");
/* harmony import */ var _powersync_common__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @powersync/common */ "../common/dist/bundle.mjs");
/* harmony import */ var async_mutex__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! async-mutex */ "../../node_modules/async-mutex/index.mjs");



/**
 * List of currently tested virtual filesystems
 */
var WASQLiteVFS;
(function (WASQLiteVFS) {
    WASQLiteVFS["IDBBatchAtomicVFS"] = "IDBBatchAtomicVFS";
    WASQLiteVFS["OPFSCoopSyncVFS"] = "OPFSCoopSyncVFS";
    WASQLiteVFS["AccessHandlePoolVFS"] = "AccessHandlePoolVFS";
})(WASQLiteVFS || (WASQLiteVFS = {}));
/**
 * @internal
 */
const AsyncWASQLiteModuleFactory = async () => {
    const { default: factory } = await __webpack_require__.e(/*! import() */ "node_modules_journeyapps_wa-sqlite_dist_wa-sqlite-async_mjs").then(__webpack_require__.bind(__webpack_require__, /*! @journeyapps/wa-sqlite/dist/wa-sqlite-async.mjs */ "../../node_modules/@journeyapps/wa-sqlite/dist/wa-sqlite-async.mjs"));
    return factory();
};
/**
 * @internal
 */
const MultiCipherAsyncWASQLiteModuleFactory = async () => {
    const { default: factory } = await __webpack_require__.e(/*! import() */ "node_modules_journeyapps_wa-sqlite_dist_mc-wa-sqlite-async_mjs").then(__webpack_require__.bind(__webpack_require__, /*! @journeyapps/wa-sqlite/dist/mc-wa-sqlite-async.mjs */ "../../node_modules/@journeyapps/wa-sqlite/dist/mc-wa-sqlite-async.mjs"));
    return factory();
};
/**
 * @internal
 */
const SyncWASQLiteModuleFactory = async () => {
    const { default: factory } = await __webpack_require__.e(/*! import() */ "node_modules_journeyapps_wa-sqlite_dist_wa-sqlite_mjs").then(__webpack_require__.bind(__webpack_require__, /*! @journeyapps/wa-sqlite/dist/wa-sqlite.mjs */ "../../node_modules/@journeyapps/wa-sqlite/dist/wa-sqlite.mjs"));
    return factory();
};
/**
 * @internal
 */
const MultiCipherSyncWASQLiteModuleFactory = async () => {
    const { default: factory } = await __webpack_require__.e(/*! import() */ "node_modules_journeyapps_wa-sqlite_dist_mc-wa-sqlite_mjs").then(__webpack_require__.bind(__webpack_require__, /*! @journeyapps/wa-sqlite/dist/mc-wa-sqlite.mjs */ "../../node_modules/@journeyapps/wa-sqlite/dist/mc-wa-sqlite.mjs"));
    return factory();
};
/**
 * @internal
 */
const DEFAULT_MODULE_FACTORIES = {
    [WASQLiteVFS.IDBBatchAtomicVFS]: async (options) => {
        let module;
        if (options.encryptionKey) {
            module = await MultiCipherAsyncWASQLiteModuleFactory();
        }
        else {
            module = await AsyncWASQLiteModuleFactory();
        }
        const { IDBBatchAtomicVFS } = await __webpack_require__.e(/*! import() */ "node_modules_journeyapps_wa-sqlite_src_examples_IDBBatchAtomicVFS_js").then(__webpack_require__.bind(__webpack_require__, /*! @journeyapps/wa-sqlite/src/examples/IDBBatchAtomicVFS.js */ "../../node_modules/@journeyapps/wa-sqlite/src/examples/IDBBatchAtomicVFS.js"));
        return {
            module,
            // @ts-expect-error The types for this static method are missing upstream
            vfs: await IDBBatchAtomicVFS.create(options.dbFileName, module, { lockPolicy: 'exclusive' })
        };
    },
    [WASQLiteVFS.AccessHandlePoolVFS]: async (options) => {
        let module;
        if (options.encryptionKey) {
            module = await MultiCipherSyncWASQLiteModuleFactory();
        }
        else {
            module = await SyncWASQLiteModuleFactory();
        }
        // @ts-expect-error The types for this static method are missing upstream
        const { AccessHandlePoolVFS } = await __webpack_require__.e(/*! import() */ "node_modules_journeyapps_wa-sqlite_src_examples_AccessHandlePoolVFS_js").then(__webpack_require__.bind(__webpack_require__, /*! @journeyapps/wa-sqlite/src/examples/AccessHandlePoolVFS.js */ "../../node_modules/@journeyapps/wa-sqlite/src/examples/AccessHandlePoolVFS.js"));
        return {
            module,
            vfs: await AccessHandlePoolVFS.create(options.dbFileName, module)
        };
    },
    [WASQLiteVFS.OPFSCoopSyncVFS]: async (options) => {
        let module;
        if (options.encryptionKey) {
            module = await MultiCipherSyncWASQLiteModuleFactory();
        }
        else {
            module = await SyncWASQLiteModuleFactory();
        }
        // @ts-expect-error The types for this static method are missing upstream
        const { OPFSCoopSyncVFS } = await __webpack_require__.e(/*! import() */ "node_modules_journeyapps_wa-sqlite_src_examples_OPFSCoopSyncVFS_js").then(__webpack_require__.bind(__webpack_require__, /*! @journeyapps/wa-sqlite/src/examples/OPFSCoopSyncVFS.js */ "../../node_modules/@journeyapps/wa-sqlite/src/examples/OPFSCoopSyncVFS.js"));
        const vfs = await OPFSCoopSyncVFS.create(options.dbFileName, module);
        return {
            module,
            vfs
        };
    }
};
/**
 * @internal
 * WA-SQLite connection which directly interfaces with WA-SQLite.
 * This is usually instantiated inside a worker.
 */
class WASqliteConnection extends _powersync_common__WEBPACK_IMPORTED_MODULE_1__.BaseObserver {
    options;
    _sqliteAPI = null;
    _dbP = null;
    _moduleFactory;
    updatedTables;
    updateTimer;
    statementMutex;
    broadcastChannel;
    /**
     * Unique id for this specific connection. This is used to prevent broadcast table change
     * notification loops.
     */
    connectionId;
    _holdCounter;
    _holdId;
    constructor(options) {
        super();
        this.options = options;
        this.updatedTables = new Set();
        this.updateTimer = null;
        this.broadcastChannel = null;
        this.connectionId = new Date().valueOf() + Math.random();
        this.statementMutex = new async_mutex__WEBPACK_IMPORTED_MODULE_2__.Mutex();
        this._moduleFactory = DEFAULT_MODULE_FACTORIES[this.options.vfs];
        this._holdCounter = 0;
        this._holdId = null;
    }
    /**
     * Gets the id for the current hold.
     * This can be used to check for invalid states.
     */
    get currentHoldId() {
        return this._holdId;
    }
    get sqliteAPI() {
        if (!this._sqliteAPI) {
            throw new Error(`Initialization has not completed`);
        }
        return this._sqliteAPI;
    }
    get dbP() {
        if (!this._dbP) {
            throw new Error(`Initialization has not completed`);
        }
        return this._dbP;
    }
    /**
     * Checks if the database connection is in autocommit mode.
     * @returns true if in autocommit mode, false if in a transaction
     */
    async isAutoCommit() {
        return this.sqliteAPI.get_autocommit(this.dbP) != 0;
    }
    async markHold() {
        const previousHoldId = this._holdId;
        this._holdId = `${++this._holdCounter}`;
        if (previousHoldId) {
            await this.iterateAsyncListeners(async (cb) => cb.holdOverwritten?.(previousHoldId));
        }
        return this._holdId;
    }
    async releaseHold(holdId) {
        if (holdId != this._holdId) {
            throw new Error(`Invalid hold state, expected ${this._holdId} but got ${holdId}`);
        }
        this._holdId = null;
    }
    async openDB() {
        this._dbP = await this.sqliteAPI.open_v2(this.options.dbFilename);
        return this._dbP;
    }
    async executeEncryptionPragma() {
        if (this.options.encryptionKey) {
            await this.executeSingleStatement(`PRAGMA key = "${this.options.encryptionKey}"`);
        }
        return;
    }
    async openSQLiteAPI() {
        const { module, vfs } = await this._moduleFactory({
            dbFileName: this.options.dbFilename,
            encryptionKey: this.options.encryptionKey
        });
        const sqlite3 = _journeyapps_wa_sqlite__WEBPACK_IMPORTED_MODULE_0__.Factory(module);
        sqlite3.vfs_register(vfs, true);
        /**
         * Register the PowerSync core SQLite extension
         */
        module.ccall('powersync_init_static', 'int', []);
        /**
         * Create the multiple cipher vfs if an encryption key is provided
         */
        if (this.options.encryptionKey) {
            const createResult = module.ccall('sqlite3mc_vfs_create', 'int', ['string', 'int'], [this.options.dbFilename, 1]);
            if (createResult !== 0) {
                throw new Error('Failed to create multiple cipher vfs, Database encryption will not work');
            }
        }
        return sqlite3;
    }
    registerBroadcastListeners() {
        this.broadcastChannel = new BroadcastChannel(`${this.options.dbFilename}-table-updates`);
        this.broadcastChannel.addEventListener('message', (event) => {
            const data = event.data;
            if (this.connectionId == data.connectionId) {
                // Ignore messages from the same connection
                return;
            }
            // Ensuring that we don't rebroadcast the same message
            this.queueTableUpdate(data.changedTables, false);
        });
    }
    queueTableUpdate(tableNames, shouldBroadcast = true) {
        tableNames.forEach((tableName) => this.updatedTables.add(tableName));
        if (this.updateTimer == null) {
            this.updateTimer = setTimeout(() => this.fireUpdates(shouldBroadcast), 0);
        }
    }
    async init() {
        this._sqliteAPI = await this.openSQLiteAPI();
        await this.openDB();
        this.registerBroadcastListeners();
        await this.executeSingleStatement(`PRAGMA temp_store = ${this.options.temporaryStorage};`);
        await this.executeEncryptionPragma();
        await this.executeSingleStatement(`PRAGMA cache_size = -${this.options.cacheSizeKb};`);
        this.sqliteAPI.update_hook(this.dbP, (updateType, dbName, tableName) => {
            if (!tableName) {
                return;
            }
            const changedTables = new Set([tableName]);
            this.queueTableUpdate(changedTables);
        });
    }
    async getConfig() {
        return this.options;
    }
    fireUpdates(shouldBroadcast = true) {
        this.updateTimer = null;
        const event = { tables: [...this.updatedTables], groupedUpdates: {}, rawUpdates: [] };
        // Share to other connections
        if (shouldBroadcast) {
            this.broadcastChannel.postMessage({
                changedTables: this.updatedTables,
                connectionId: this.connectionId
            });
        }
        this.updatedTables.clear();
        this.iterateListeners((cb) => cb.tablesUpdated?.(event));
    }
    /**
     * This executes SQL statements in a batch.
     */
    async executeBatch(sql, bindings) {
        return this.acquireExecuteLock(async () => {
            let affectedRows = 0;
            try {
                await this.executeSingleStatement('BEGIN TRANSACTION');
                const wrappedBindings = bindings ? bindings : [];
                for await (const stmt of this.sqliteAPI.statements(this.dbP, sql)) {
                    if (stmt === null) {
                        return {
                            rowsAffected: 0,
                            rows: { _array: [], length: 0 }
                        };
                    }
                    //Prepare statement once
                    for (const binding of wrappedBindings) {
                        // TODO not sure why this is needed currently, but booleans break
                        for (let i = 0; i < binding.length; i++) {
                            const b = binding[i];
                            if (typeof b == 'boolean') {
                                binding[i] = b ? 1 : 0;
                            }
                        }
                        if (bindings) {
                            this.sqliteAPI.bind_collection(stmt, binding);
                        }
                        const result = await this.sqliteAPI.step(stmt);
                        if (result === _journeyapps_wa_sqlite__WEBPACK_IMPORTED_MODULE_0__.SQLITE_DONE) {
                            //The value returned by sqlite3_changes() immediately after an INSERT, UPDATE or DELETE statement run on a view is always zero.
                            affectedRows += this.sqliteAPI.changes(this.dbP);
                        }
                        this.sqliteAPI.reset(stmt);
                    }
                }
                await this.executeSingleStatement('COMMIT');
            }
            catch (err) {
                await this.executeSingleStatement('ROLLBACK');
                return {
                    rowsAffected: 0,
                    rows: { _array: [], length: 0 }
                };
            }
            const result = {
                rowsAffected: affectedRows,
                rows: { _array: [], length: 0 }
            };
            return result;
        });
    }
    /**
     * This executes single SQL statements inside a requested lock.
     */
    async execute(sql, bindings) {
        // Running multiple statements on the same connection concurrently should not be allowed
        return this.acquireExecuteLock(async () => {
            return this.executeSingleStatement(sql, bindings);
        });
    }
    async executeRaw(sql, bindings) {
        return this.acquireExecuteLock(async () => {
            return this.executeSingleStatementRaw(sql, bindings);
        });
    }
    async close() {
        this.broadcastChannel?.close();
        await this.acquireExecuteLock(async () => {
            /**
             * Running the close operation inside the same execute mutex prevents errors like:
             * ```
             * unable to close due to unfinalized statements or unfinished backups
             * ```
             */
            await this.sqliteAPI.close(this.dbP);
        });
    }
    async registerOnTableChange(callback) {
        return this.registerListener({
            tablesUpdated: (event) => callback(event)
        });
    }
    /**
     * This requests a lock for executing statements.
     * Should only be used internally.
     */
    acquireExecuteLock = (callback) => {
        return this.statementMutex.runExclusive(callback);
    };
    /**
     * This executes a single statement using SQLite3.
     */
    async executeSingleStatement(sql, bindings) {
        const results = await this._execute(sql, bindings);
        const rows = [];
        for (const resultSet of results) {
            for (const row of resultSet.rows) {
                const outRow = {};
                resultSet.columns.forEach((key, index) => {
                    outRow[key] = row[index];
                });
                rows.push(outRow);
            }
        }
        const result = {
            insertId: this.sqliteAPI.last_insert_id(this.dbP),
            rowsAffected: this.sqliteAPI.changes(this.dbP),
            rows: {
                _array: rows,
                length: rows.length
            }
        };
        return result;
    }
    /**
     * This executes a single statement using SQLite3 and returns the results as an array of arrays.
     */
    async executeSingleStatementRaw(sql, bindings) {
        const results = await this._execute(sql, bindings);
        return results.flatMap((resultset) => resultset.rows.map((row) => resultset.columns.map((_, index) => row[index])));
    }
    async _execute(sql, bindings) {
        const results = [];
        for await (const stmt of this.sqliteAPI.statements(this.dbP, sql)) {
            let columns;
            const wrappedBindings = bindings ? [bindings] : [[]];
            for (const binding of wrappedBindings) {
                // TODO not sure why this is needed currently, but booleans break
                binding.forEach((b, index, arr) => {
                    if (typeof b == 'boolean') {
                        arr[index] = b ? 1 : 0;
                    }
                });
                this.sqliteAPI.reset(stmt);
                if (bindings) {
                    this.sqliteAPI.bind_collection(stmt, binding);
                }
                const rows = [];
                while ((await this.sqliteAPI.step(stmt)) === _journeyapps_wa_sqlite__WEBPACK_IMPORTED_MODULE_0__.SQLITE_ROW) {
                    const row = this.sqliteAPI.row(stmt);
                    rows.push(row);
                }
                columns = columns ?? this.sqliteAPI.column_names(stmt);
                if (columns.length) {
                    results.push({ columns, rows });
                }
            }
            // When binding parameters, only a single statement is executed.
            if (bindings) {
                break;
            }
        }
        return results;
    }
}


/***/ },

/***/ "./lib/src/db/sync/WebRemote.js"
/*!**************************************!*\
  !*** ./lib/src/db/sync/WebRemote.js ***!
  \**************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   WebRemote: () => (/* binding */ WebRemote)
/* harmony export */ });
/* harmony import */ var _powersync_common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @powersync/common */ "../common/dist/bundle.mjs");
/* harmony import */ var _userAgent__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./userAgent */ "./lib/src/db/sync/userAgent.js");


/*
 * Depends on browser's implementation of global fetch.
 */
class WebFetchProvider extends _powersync_common__WEBPACK_IMPORTED_MODULE_0__.FetchImplementationProvider {
    getFetch() {
        return fetch.bind(globalThis);
    }
}
class WebRemote extends _powersync_common__WEBPACK_IMPORTED_MODULE_0__.AbstractRemote {
    connector;
    logger;
    _bson;
    constructor(connector, logger = _powersync_common__WEBPACK_IMPORTED_MODULE_0__.DEFAULT_REMOTE_LOGGER, options) {
        super(connector, logger, {
            ...(options ?? {}),
            fetchImplementation: options?.fetchImplementation ?? new WebFetchProvider()
        });
        this.connector = connector;
        this.logger = logger;
    }
    getUserAgent() {
        let ua = [super.getUserAgent(), `powersync-web`];
        try {
            ua.push(...(0,_userAgent__WEBPACK_IMPORTED_MODULE_1__.getUserAgentInfo)());
        }
        catch (e) {
            this.logger.warn('Failed to get user agent info', e);
        }
        return ua.join(' ');
    }
    async getBSON() {
        if (this._bson) {
            return this._bson;
        }
        /**
         * Dynamic import to be used only when needed.
         */
        const { BSON } = await __webpack_require__.e(/*! import() */ "node_modules_bson_lib_bson_mjs").then(__webpack_require__.bind(__webpack_require__, /*! bson */ "../../node_modules/bson/lib/bson.mjs"));
        this._bson = BSON;
        return this._bson;
    }
}


/***/ },

/***/ "./lib/src/db/sync/WebStreamingSyncImplementation.js"
/*!***********************************************************!*\
  !*** ./lib/src/db/sync/WebStreamingSyncImplementation.js ***!
  \***********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   WebStreamingSyncImplementation: () => (/* binding */ WebStreamingSyncImplementation)
/* harmony export */ });
/* harmony import */ var _powersync_common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @powersync/common */ "../common/dist/bundle.mjs");
/* harmony import */ var _shared_navigator__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../shared/navigator */ "./lib/src/shared/navigator.js");


class WebStreamingSyncImplementation extends _powersync_common__WEBPACK_IMPORTED_MODULE_0__.AbstractStreamingSyncImplementation {
    constructor(options) {
        // Super will store and provide default values for options
        super(options);
    }
    get webOptions() {
        return this.options;
    }
    async obtainLock(lockOptions) {
        const identifier = `streaming-sync-${lockOptions.type}-${this.webOptions.identifier}`;
        if (lockOptions.type == _powersync_common__WEBPACK_IMPORTED_MODULE_0__.LockType.SYNC) {
            this.logger.debug('requesting lock for ', identifier);
        }
        return (0,_shared_navigator__WEBPACK_IMPORTED_MODULE_1__.getNavigatorLocks)().request(identifier, { signal: lockOptions.signal }, lockOptions.callback);
    }
}


/***/ },

/***/ "./lib/src/db/sync/userAgent.js"
/*!**************************************!*\
  !*** ./lib/src/db/sync/userAgent.js ***!
  \**************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getUserAgentInfo: () => (/* binding */ getUserAgentInfo)
/* harmony export */ });
/**
 * Get a minimal representation of browser, version and operating system.
 *
 * The goal is to get enough environemnt info to reproduce issues, but no
 * more.
 */
function getUserAgentInfo(nav) {
    nav ??= navigator;
    const browser = getBrowserInfo(nav);
    const os = getOsInfo(nav);
    // The cast below is to cater for TypeScript < 5.5.0
    return [browser, os].filter((v) => v != null);
}
function getBrowserInfo(nav) {
    const brands = nav.userAgentData?.brands;
    if (brands != null) {
        const tests = [
            { name: 'Google Chrome', value: 'Chrome' },
            { name: 'Opera', value: 'Opera' },
            { name: 'Edge', value: 'Edge' },
            { name: 'Chromium', value: 'Chromium' }
        ];
        for (let { name, value } of tests) {
            const brand = brands.find((b) => b.brand == name);
            if (brand != null) {
                return `${value}/${brand.version}`;
            }
        }
    }
    const ua = nav.userAgent;
    const regexps = [
        { re: /(?:firefox|fxios)\/(\d+)/i, value: 'Firefox' },
        { re: /(?:edg|edge|edga|edgios)\/(\d+)/i, value: 'Edge' },
        { re: /opr\/(\d+)/i, value: 'Opera' },
        { re: /(?:chrome|chromium|crios)\/(\d+)/i, value: 'Chrome' },
        { re: /version\/(\d+).*safari/i, value: 'Safari' }
    ];
    for (let { re, value } of regexps) {
        const match = re.exec(ua);
        if (match != null) {
            return `${value}/${match[1]}`;
        }
    }
    return null;
}
function getOsInfo(nav) {
    if (nav.userAgentData?.platform != null) {
        return nav.userAgentData.platform.toLowerCase();
    }
    const ua = nav.userAgent;
    const regexps = [
        { re: /windows/i, value: 'windows' },
        { re: /android/i, value: 'android' },
        { re: /linux/i, value: 'linux' },
        { re: /iphone|ipad|ipod/i, value: 'ios' },
        { re: /macintosh|mac os x/i, value: 'macos' }
    ];
    for (let { re, value } of regexps) {
        if (re.test(ua)) {
            return value;
        }
    }
    return null;
}


/***/ },

/***/ "./lib/src/shared/navigator.js"
/*!*************************************!*\
  !*** ./lib/src/shared/navigator.js ***!
  \*************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   getNavigatorLocks: () => (/* binding */ getNavigatorLocks)
/* harmony export */ });
const getNavigatorLocks = () => {
    if ('locks' in navigator && navigator.locks) {
        return navigator.locks;
    }
    throw new Error('Navigator locks are not available in an insecure context. Use a secure context such as HTTPS or http://localhost.');
};


/***/ },

/***/ "./lib/src/worker/sync/BroadcastLogger.js"
/*!************************************************!*\
  !*** ./lib/src/worker/sync/BroadcastLogger.js ***!
  \************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   BroadcastLogger: () => (/* binding */ BroadcastLogger)
/* harmony export */ });
/* harmony import */ var _powersync_common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @powersync/common */ "../common/dist/bundle.mjs");

/**
 * Broadcasts logs to all clients
 */
class BroadcastLogger {
    clients;
    TRACE;
    DEBUG;
    INFO;
    TIME;
    WARN;
    ERROR;
    OFF;
    currentLevel = _powersync_common__WEBPACK_IMPORTED_MODULE_0__.LogLevel.INFO;
    constructor(clients) {
        this.clients = clients;
        this.TRACE = _powersync_common__WEBPACK_IMPORTED_MODULE_0__.LogLevel.TRACE;
        this.DEBUG = _powersync_common__WEBPACK_IMPORTED_MODULE_0__.LogLevel.DEBUG;
        this.INFO = _powersync_common__WEBPACK_IMPORTED_MODULE_0__.LogLevel.INFO;
        this.TIME = _powersync_common__WEBPACK_IMPORTED_MODULE_0__.LogLevel.TIME;
        this.WARN = _powersync_common__WEBPACK_IMPORTED_MODULE_0__.LogLevel.WARN;
        this.ERROR = _powersync_common__WEBPACK_IMPORTED_MODULE_0__.LogLevel.ERROR;
        this.OFF = _powersync_common__WEBPACK_IMPORTED_MODULE_0__.LogLevel.OFF;
    }
    trace(...x) {
        if (!this.enabledFor(this.TRACE))
            return;
        console.trace(...x);
        const sanitized = this.sanitizeArgs(x);
        this.iterateClients((client) => client.clientProvider.trace(...sanitized));
    }
    debug(...x) {
        if (!this.enabledFor(this.DEBUG))
            return;
        console.debug(...x);
        const sanitized = this.sanitizeArgs(x);
        this.iterateClients((client) => client.clientProvider.debug(...sanitized));
    }
    info(...x) {
        if (!this.enabledFor(this.INFO))
            return;
        console.info(...x);
        const sanitized = this.sanitizeArgs(x);
        this.iterateClients((client) => client.clientProvider.info(...sanitized));
    }
    log(...x) {
        if (!this.enabledFor(this.INFO))
            return;
        console.log(...x);
        const sanitized = this.sanitizeArgs(x);
        this.iterateClients((client) => client.clientProvider.log(...sanitized));
    }
    warn(...x) {
        if (!this.enabledFor(this.WARN))
            return;
        console.warn(...x);
        const sanitized = this.sanitizeArgs(x);
        this.iterateClients((client) => client.clientProvider.warn(...sanitized));
    }
    error(...x) {
        if (!this.enabledFor(this.ERROR))
            return;
        console.error(...x);
        const sanitized = this.sanitizeArgs(x);
        this.iterateClients((client) => client.clientProvider.error(...sanitized));
    }
    time(label) {
        if (!this.enabledFor(this.TIME))
            return;
        console.time(label);
        this.iterateClients((client) => client.clientProvider.time(label));
    }
    timeEnd(label) {
        if (!this.enabledFor(this.TIME))
            return;
        console.timeEnd(label);
        this.iterateClients((client) => client.clientProvider.timeEnd(label));
    }
    /**
     * Set the global log level.
     */
    setLevel(level) {
        this.currentLevel = level;
    }
    /**
     * Get the current log level.
     */
    getLevel() {
        return this.currentLevel;
    }
    /**
     * Returns true if the given level is enabled.
     */
    enabledFor(level) {
        return level.value >= this.currentLevel.value;
    }
    /**
     * Iterates all clients, catches individual client exceptions
     * and proceeds to execute for all clients.
     */
    async iterateClients(callback) {
        for (const client of this.clients) {
            try {
                await callback(client);
            }
            catch (ex) {
                console.error('Caught exception when iterating client', ex);
            }
        }
    }
    /**
     * Guards against any logging errors.
     * We don't want a logging exception to cause further issues upstream
     */
    sanitizeArgs(x) {
        const sanitizedParams = x.map((param) => {
            try {
                // Try and clone here first. If it fails it won't be passable over a MessagePort
                return structuredClone(param);
            }
            catch (ex) {
                console.error(ex);
                return 'Could not serialize log params. Check shared worker logs for more details.';
            }
        });
        return sanitizedParams;
    }
}


/***/ },

/***/ "./lib/src/worker/sync/SharedSyncImplementation.js"
/*!*********************************************************!*\
  !*** ./lib/src/worker/sync/SharedSyncImplementation.js ***!
  \*********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   SharedSyncClientEvent: () => (/* binding */ SharedSyncClientEvent),
/* harmony export */   SharedSyncImplementation: () => (/* binding */ SharedSyncImplementation)
/* harmony export */ });
/* harmony import */ var _powersync_common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @powersync/common */ "../common/dist/bundle.mjs");
/* harmony import */ var async_mutex__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! async-mutex */ "../../node_modules/async-mutex/index.mjs");
/* harmony import */ var comlink__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! comlink */ "../../node_modules/comlink/dist/esm/comlink.mjs");
/* harmony import */ var _db_sync_WebRemote__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../db/sync/WebRemote */ "./lib/src/db/sync/WebRemote.js");
/* harmony import */ var _db_sync_WebStreamingSyncImplementation__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../../db/sync/WebStreamingSyncImplementation */ "./lib/src/db/sync/WebStreamingSyncImplementation.js");
/* harmony import */ var _db_adapters_LockedAsyncDatabaseAdapter__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../../db/adapters/LockedAsyncDatabaseAdapter */ "./lib/src/db/adapters/LockedAsyncDatabaseAdapter.js");
/* harmony import */ var _db_adapters_WorkerWrappedAsyncDatabaseConnection__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../../db/adapters/WorkerWrappedAsyncDatabaseConnection */ "./lib/src/db/adapters/WorkerWrappedAsyncDatabaseConnection.js");
/* harmony import */ var _BroadcastLogger__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./BroadcastLogger */ "./lib/src/worker/sync/BroadcastLogger.js");








/**
 * @internal
 * Manual message events for shared sync clients
 */
var SharedSyncClientEvent;
(function (SharedSyncClientEvent) {
    /**
     * This client requests the shared sync manager should
     * close it's connection to the client.
     */
    SharedSyncClientEvent["CLOSE_CLIENT"] = "close-client";
    SharedSyncClientEvent["CLOSE_ACK"] = "close-ack";
})(SharedSyncClientEvent || (SharedSyncClientEvent = {}));
/**
 * HACK: The shared implementation wraps and provides its own
 * PowerSyncBackendConnector when generating the streaming sync implementation.
 * We provide this unused placeholder when connecting with the ConnectionManager.
 */
const CONNECTOR_PLACEHOLDER = {};
/**
 * @internal
 * Shared sync implementation which runs inside a shared webworker
 */
class SharedSyncImplementation extends _powersync_common__WEBPACK_IMPORTED_MODULE_0__.BaseObserver {
    ports;
    isInitialized;
    statusListener;
    fetchCredentialsController;
    uploadDataController;
    syncParams;
    logger;
    lastConnectOptions;
    portMutex;
    subscriptions = [];
    connectionManager;
    syncStatus;
    broadCastLogger;
    distributedDB;
    constructor() {
        super();
        this.ports = [];
        this.syncParams = null;
        this.logger = (0,_powersync_common__WEBPACK_IMPORTED_MODULE_0__.createLogger)('shared-sync');
        this.lastConnectOptions = undefined;
        this.portMutex = new async_mutex__WEBPACK_IMPORTED_MODULE_1__.Mutex();
        this.isInitialized = new Promise((resolve) => {
            const callback = this.registerListener({
                initialized: () => {
                    resolve();
                    callback?.();
                }
            });
        });
        // Should be configured once we get params
        this.distributedDB = null;
        this.syncStatus = new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.SyncStatus({});
        this.broadCastLogger = new _BroadcastLogger__WEBPACK_IMPORTED_MODULE_7__.BroadcastLogger(this.ports);
        this.connectionManager = new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.ConnectionManager({
            createSyncImplementation: async () => {
                await this.waitForReady();
                const sync = this.generateStreamingImplementation();
                const onDispose = sync.registerListener({
                    statusChanged: (status) => {
                        this.updateAllStatuses(status.toJSON());
                    }
                });
                return {
                    sync,
                    onDispose
                };
            },
            logger: this.logger
        });
    }
    get lastSyncedAt() {
        return this.connectionManager.syncStreamImplementation?.lastSyncedAt;
    }
    get isConnected() {
        return this.connectionManager.syncStreamImplementation?.isConnected ?? false;
    }
    /**
     * Gets the last client port which we know is safe from unexpected closes.
     */
    async getLastWrappedPort() {
        // Find the last port which is not closing
        return await this.portMutex.runExclusive(() => {
            for (let i = this.ports.length - 1; i >= 0; i--) {
                if (!this.ports[i].isClosing) {
                    return this.ports[i];
                }
            }
            return;
        });
    }
    /**
     * In some very rare cases a specific tab might not respond to requests.
     * This returns a random port which is not closing.
     */
    async getRandomWrappedPort() {
        return await this.portMutex.runExclusive(() => {
            const nonClosingPorts = this.ports.filter((p) => !p.isClosing);
            return nonClosingPorts[Math.floor(Math.random() * nonClosingPorts.length)];
        });
    }
    async waitForStatus(status) {
        return this.withSyncImplementation(async (sync) => {
            return sync.waitForStatus(status);
        });
    }
    async waitUntilStatusMatches(predicate) {
        return this.withSyncImplementation(async (sync) => {
            return sync.waitUntilStatusMatches(predicate);
        });
    }
    async waitForReady() {
        return this.isInitialized;
    }
    collectActiveSubscriptions() {
        this.logger.debug('Collecting active stream subscriptions across tabs');
        const active = new Map();
        for (const port of this.ports) {
            for (const stream of port.currentSubscriptions) {
                const serializedKey = JSON.stringify(stream);
                active.set(serializedKey, stream);
            }
        }
        this.subscriptions = [...active.values()];
        this.logger.debug('Collected stream subscriptions', this.subscriptions);
        this.connectionManager.syncStreamImplementation?.updateSubscriptions(this.subscriptions);
    }
    updateSubscriptions(port, subscriptions) {
        port.currentSubscriptions = subscriptions;
        this.collectActiveSubscriptions();
    }
    setLogLevel(level) {
        this.logger.setLevel(level);
        this.broadCastLogger.setLevel(level);
    }
    /**
     * Configures the DBAdapter connection and a streaming sync client.
     */
    async setParams(params) {
        await this.portMutex.runExclusive(async () => {
            this.collectActiveSubscriptions();
        });
        if (this.syncParams) {
            // Cannot modify already existing sync implementation params
            return;
        }
        // First time setting params
        this.syncParams = params;
        if (params.streamOptions?.flags?.broadcastLogs) {
            this.logger = this.broadCastLogger;
        }
        const lockedAdapter = new _db_adapters_LockedAsyncDatabaseAdapter__WEBPACK_IMPORTED_MODULE_5__.LockedAsyncDatabaseAdapter({
            name: params.dbParams.dbFilename,
            openConnection: async () => {
                // Gets a connection from the clients when a new connection is requested.
                const db = await this.openInternalDB();
                db.registerListener({
                    closing: () => {
                        lockedAdapter.reOpenInternalDB();
                    }
                });
                return db;
            },
            logger: this.logger,
            reOpenOnConnectionClosed: true
        });
        this.distributedDB = lockedAdapter;
        await lockedAdapter.init();
        lockedAdapter.registerListener({
            databaseReOpened: () => {
                // We may have missed some table updates while the database was closed.
                // We can poke the crud in case we missed any updates.
                this.connectionManager.syncStreamImplementation?.triggerCrudUpload();
                /**
                 * FIXME or IMPROVE ME
                 * The Rust client implementation stores sync state on the connection level.
                 * Reopening the database causes a state machine error which should cause the
                 * StreamingSyncImplementation to reconnect. It would be nicer if we could trigger
                 * this reconnect earlier.
                 * This reconnect is not required for IndexedDB.
                 */
            }
        });
        self.onerror = (event) => {
            // Share any uncaught events on the broadcast logger
            this.logger.error('Uncaught exception in PowerSync shared sync worker', event);
        };
        this.iterateListeners((l) => l.initialized?.());
    }
    async dispose() {
        await this.waitForReady();
        this.statusListener?.();
        return this.connectionManager.close();
    }
    /**
     * Connects to the PowerSync backend instance.
     * Multiple tabs can safely call this in their initialization.
     * The connection will simply be reconnected whenever a new tab
     * connects.
     */
    async connect(options) {
        this.lastConnectOptions = options;
        return this.connectionManager.connect(CONNECTOR_PLACEHOLDER, options ?? {});
    }
    async disconnect() {
        return this.connectionManager.disconnect();
    }
    /**
     * Adds a new client tab's message port to the list of connected ports
     */
    async addPort(port) {
        return await this.portMutex.runExclusive(() => {
            const portProvider = {
                port,
                clientProvider: comlink__WEBPACK_IMPORTED_MODULE_2__.wrap(port),
                currentSubscriptions: [],
                closeListeners: [],
                isClosing: false
            };
            this.ports.push(portProvider);
            // Give the newly connected client the latest status
            const status = this.connectionManager.syncStreamImplementation?.syncStatus;
            if (status) {
                portProvider.clientProvider.statusChanged(status.toJSON());
            }
            return portProvider;
        });
    }
    /**
     * Removes a message port client from this manager's managed
     * clients.
     */
    async removePort(port) {
        // Ports might be removed faster than we can process them.
        port.isClosing = true;
        // Remove the port within a mutex context.
        // Warns if the port is not found. This should not happen in practice.
        // We return early if the port is not found.
        return await this.portMutex.runExclusive(async () => {
            const index = this.ports.findIndex((p) => p == port);
            if (index < 0) {
                this.logger.warn(`Could not remove port ${port} since it is not present in active ports.`);
                return () => { };
            }
            const trackedPort = this.ports[index];
            // Remove from the list of active ports
            this.ports.splice(index, 1);
            /**
             * The port might currently be in use. Any active functions might
             * not resolve. Abort them here.
             */
            [this.fetchCredentialsController, this.uploadDataController].forEach((abortController) => {
                if (abortController?.activePort == port) {
                    abortController.controller.abort(new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.AbortOperation('Closing pending requests after client port is removed'));
                }
            });
            // Close the worker wrapped database connection, we can't accurately rely on this connection
            for (const closeListener of trackedPort.closeListeners) {
                await closeListener();
            }
            this.collectActiveSubscriptions();
            return () => trackedPort.clientProvider[comlink__WEBPACK_IMPORTED_MODULE_2__.releaseProxy]();
        });
    }
    triggerCrudUpload() {
        this.withSyncImplementation(async (sync) => {
            sync.triggerCrudUpload();
        });
    }
    async hasCompletedSync() {
        return this.withSyncImplementation(async (sync) => {
            return sync.hasCompletedSync();
        });
    }
    async getWriteCheckpoint() {
        return this.withSyncImplementation(async (sync) => {
            return sync.getWriteCheckpoint();
        });
    }
    async withSyncImplementation(callback) {
        await this.waitForReady();
        if (this.connectionManager.syncStreamImplementation) {
            return callback(this.connectionManager.syncStreamImplementation);
        }
        const sync = await new Promise((resolve) => {
            const dispose = this.connectionManager.registerListener({
                syncStreamCreated: (sync) => {
                    resolve(sync);
                    dispose?.();
                }
            });
        });
        return callback(sync);
    }
    generateStreamingImplementation() {
        // This should only be called after initialization has completed
        const syncParams = this.syncParams;
        // Create a new StreamingSyncImplementation for each connect call. This is usually done is all SDKs.
        return new _db_sync_WebStreamingSyncImplementation__WEBPACK_IMPORTED_MODULE_4__.WebStreamingSyncImplementation({
            adapter: new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.SqliteBucketStorage(this.distributedDB, this.logger),
            remote: new _db_sync_WebRemote__WEBPACK_IMPORTED_MODULE_3__.WebRemote({
                invalidateCredentials: async () => {
                    const lastPort = await this.getLastWrappedPort();
                    if (!lastPort) {
                        throw new Error('No client port found to invalidate credentials');
                    }
                    try {
                        this.logger.log('calling the last port client provider to invalidate credentials');
                        lastPort.clientProvider.invalidateCredentials();
                    }
                    catch (ex) {
                        this.logger.error('error invalidating credentials', ex);
                    }
                },
                fetchCredentials: async () => {
                    const lastPort = await this.getLastWrappedPort();
                    if (!lastPort) {
                        throw new Error('No client port found to fetch credentials');
                    }
                    return new Promise(async (resolve, reject) => {
                        const abortController = new AbortController();
                        this.fetchCredentialsController = {
                            controller: abortController,
                            activePort: lastPort
                        };
                        abortController.signal.onabort = reject;
                        try {
                            this.logger.log('calling the last port client provider for credentials');
                            resolve(await lastPort.clientProvider.fetchCredentials());
                        }
                        catch (ex) {
                            reject(ex);
                        }
                        finally {
                            this.fetchCredentialsController = undefined;
                        }
                    });
                }
            }, this.logger),
            uploadCrud: async () => {
                const lastPort = await this.getLastWrappedPort();
                if (!lastPort) {
                    throw new Error('No client port found to upload crud');
                }
                return new Promise(async (resolve, reject) => {
                    const abortController = new AbortController();
                    this.uploadDataController = {
                        controller: abortController,
                        activePort: lastPort
                    };
                    // Resolving will make it retry
                    abortController.signal.onabort = () => resolve();
                    try {
                        resolve(await lastPort.clientProvider.uploadCrud());
                    }
                    catch (ex) {
                        reject(ex);
                    }
                    finally {
                        this.uploadDataController = undefined;
                    }
                });
            },
            ...syncParams.streamOptions,
            subscriptions: this.subscriptions,
            // Logger cannot be transferred just yet
            logger: this.logger
        });
    }
    /**
     * Opens a worker wrapped database connection. Using the last connected client port.
     */
    async openInternalDB() {
        const client = await this.getRandomWrappedPort();
        if (!client) {
            // Should not really happen in practice
            throw new Error(`Could not open DB connection since no client is connected.`);
        }
        // Fail-safe timeout for opening a database connection.
        const timeout = setTimeout(() => {
            abortController.abort();
        }, 10_000);
        /**
         * Handle cases where the client might close while opening a connection.
         */
        const abortController = new AbortController();
        const closeListener = () => {
            abortController.abort();
        };
        const removeCloseListener = () => {
            const index = client.closeListeners.indexOf(closeListener);
            if (index >= 0) {
                client.closeListeners.splice(index, 1);
            }
        };
        client.closeListeners.push(closeListener);
        const workerPort = await withAbort({
            action: () => client.clientProvider.getDBWorkerPort(),
            signal: abortController.signal,
            cleanupOnAbort: (port) => {
                port.close();
            }
        }).catch((ex) => {
            removeCloseListener();
            throw ex;
        });
        const remote = comlink__WEBPACK_IMPORTED_MODULE_2__.wrap(workerPort);
        const identifier = this.syncParams.dbParams.dbFilename;
        /**
         * The open could fail if the tab is closed while we're busy opening the database.
         * This operation is typically executed inside an exclusive portMutex lock.
         * We typically execute the closeListeners using the portMutex in a different context.
         * We can't rely on the closeListeners to abort the operation if the tab is closed.
         */
        const db = await withAbort({
            action: () => remote(this.syncParams.dbParams),
            signal: abortController.signal,
            cleanupOnAbort: (db) => {
                db.close();
            }
        }).finally(() => {
            // We can remove the close listener here since we no longer need it past this point.
            removeCloseListener();
        });
        clearTimeout(timeout);
        const wrapped = new _db_adapters_WorkerWrappedAsyncDatabaseConnection__WEBPACK_IMPORTED_MODULE_6__.WorkerWrappedAsyncDatabaseConnection({
            remote,
            baseConnection: db,
            identifier,
            // It's possible for this worker to outlive the client hosting the database for us. We need to be prepared for
            // that and ensure pending requests are aborted when the tab is closed.
            remoteCanCloseUnexpectedly: true
        });
        client.closeListeners.push(async () => {
            this.logger.info('Aborting open connection because associated tab closed.');
            /**
             * Don't await this close operation. It might never resolve if the tab is closed.
             * We mark the remote as closed first, this will reject any pending requests.
             * We then call close. The close operation is configured to fire-and-forget, the main promise will reject immediately.
             */
            wrapped.markRemoteClosed();
            wrapped.close().catch((ex) => this.logger.warn('error closing database connection', ex));
        });
        return wrapped;
    }
    /**
     * A method to update the all shared statuses for each
     * client.
     */
    updateAllStatuses(status) {
        this.syncStatus = new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.SyncStatus(status);
        this.ports.forEach((p) => p.clientProvider.statusChanged(status));
    }
}
/**
 * Runs the action with an abort controller.
 */
function withAbort(options) {
    const { action, signal, cleanupOnAbort } = options;
    return new Promise((resolve, reject) => {
        if (signal.aborted) {
            reject(new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.AbortOperation('Operation aborted by abort controller'));
            return;
        }
        function handleAbort() {
            signal.removeEventListener('abort', handleAbort);
            reject(new _powersync_common__WEBPACK_IMPORTED_MODULE_0__.AbortOperation('Operation aborted by abort controller'));
        }
        signal.addEventListener('abort', handleAbort, { once: true });
        function completePromise(action) {
            signal.removeEventListener('abort', handleAbort);
            action();
        }
        action()
            .then((data) => {
            // We already rejected due to the abort, allow for cleanup
            if (signal.aborted) {
                return completePromise(() => cleanupOnAbort?.(data));
            }
            completePromise(() => resolve(data));
        })
            .catch((e) => completePromise(() => reject(e)));
    });
}


/***/ },

/***/ "./lib/src/worker/sync/WorkerClient.js"
/*!*********************************************!*\
  !*** ./lib/src/worker/sync/WorkerClient.js ***!
  \*********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   WorkerClient: () => (/* binding */ WorkerClient)
/* harmony export */ });
/* harmony import */ var comlink__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! comlink */ "../../node_modules/comlink/dist/esm/comlink.mjs");
/* harmony import */ var _shared_navigator__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../shared/navigator */ "./lib/src/shared/navigator.js");
/* harmony import */ var _SharedSyncImplementation__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./SharedSyncImplementation */ "./lib/src/worker/sync/SharedSyncImplementation.js");



/**
 * A client to the shared sync worker.
 *
 * The shared sync implementation needs a per-client view of subscriptions so that subscriptions of closed tabs can
 * automatically be evicted later.
 */
class WorkerClient {
    sync;
    port;
    resolvedPort = null;
    resolvedPortPromise = null;
    constructor(sync, port) {
        this.sync = sync;
        this.port = port;
        comlink__WEBPACK_IMPORTED_MODULE_0__.expose(this, this.port);
        /**
         * Adds an extra listener which can remove this port
         * from the list of monitored ports.
         */
        this.port.addEventListener('message', async (event) => {
            const payload = event.data;
            if (payload?.event == _SharedSyncImplementation__WEBPACK_IMPORTED_MODULE_2__.SharedSyncClientEvent.CLOSE_CLIENT) {
                await this.removePort();
            }
        });
    }
    async removePort() {
        if (this.resolvedPort) {
            const resolved = this.resolvedPort;
            this.resolvedPort = null;
            const release = await this.sync.removePort(resolved);
            this.resolvedPort = null;
            this.port.postMessage({
                event: _SharedSyncImplementation__WEBPACK_IMPORTED_MODULE_2__.SharedSyncClientEvent.CLOSE_ACK,
                data: {}
            });
            release?.();
        }
    }
    /**
     * Called by a client after obtaining a lock with a random name.
     *
     * When the client tab is closed, its lock will be returned. So when the shared worker attempts to acquire the lock,
     * it can consider the connection to be closed.
     */
    async addLockBasedCloseSignal(name) {
        // Only add the port once the lock has been obtained on the client.
        this.resolvedPort = await this.sync.addPort(this.port);
        // Don't await this lock request
        (0,_shared_navigator__WEBPACK_IMPORTED_MODULE_1__.getNavigatorLocks)().request(name, async () => {
            await this.removePort();
        });
    }
    setLogLevel(level) {
        this.sync.setLogLevel(level);
    }
    triggerCrudUpload() {
        return this.sync.triggerCrudUpload();
    }
    setParams(params, subscriptions) {
        this.resolvedPort.currentSubscriptions = subscriptions;
        return this.sync.setParams(params);
    }
    getWriteCheckpoint() {
        return this.sync.getWriteCheckpoint();
    }
    hasCompletedSync() {
        return this.sync.hasCompletedSync();
    }
    connect(options) {
        return this.sync.connect(options);
    }
    updateSubscriptions(subscriptions) {
        if (this.resolvedPort) {
            this.sync.updateSubscriptions(this.resolvedPort, subscriptions);
        }
    }
    disconnect() {
        return this.sync.disconnect();
    }
}


/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Check if module exists (development only)
/******/ 		if (__webpack_modules__[moduleId] === undefined) {
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/ensure chunk */
/******/ 	(() => {
/******/ 		__webpack_require__.f = {};
/******/ 		// This file contains only the entry chunk.
/******/ 		// The chunk loading function for additional chunks
/******/ 		__webpack_require__.e = (chunkId) => {
/******/ 			return Promise.all(Object.keys(__webpack_require__.f).reduce((promises, key) => {
/******/ 				__webpack_require__.f[key](chunkId, promises);
/******/ 				return promises;
/******/ 			}, []));
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.u = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "worker/" + chunkId + ".umd.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		var scriptUrl;
/******/ 		if (__webpack_require__.g.importScripts) scriptUrl = __webpack_require__.g.location + "";
/******/ 		var document = __webpack_require__.g.document;
/******/ 		if (!scriptUrl && document) {
/******/ 			if (document.currentScript && document.currentScript.tagName.toUpperCase() === 'SCRIPT')
/******/ 				scriptUrl = document.currentScript.src;
/******/ 			if (!scriptUrl) {
/******/ 				var scripts = document.getElementsByTagName("script");
/******/ 				if(scripts.length) {
/******/ 					var i = scripts.length - 1;
/******/ 					while (i > -1 && (!scriptUrl || !/^http(s?):/.test(scriptUrl))) scriptUrl = scripts[i--].src;
/******/ 				}
/******/ 			}
/******/ 		}
/******/ 		// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration
/******/ 		// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.
/******/ 		if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");
/******/ 		scriptUrl = scriptUrl.replace(/^blob:/, "").replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/[^\/]+$/, "/");
/******/ 		__webpack_require__.p = scriptUrl + "../";
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/importScripts chunk loading */
/******/ 	(() => {
/******/ 		__webpack_require__.b = self.location + "/../../";
/******/ 		
/******/ 		// object to store loaded chunks
/******/ 		// "1" means "already loaded"
/******/ 		var installedChunks = {
/******/ 			"SharedSyncImplementation": 1
/******/ 		};
/******/ 		
/******/ 		// importScripts chunk loading
/******/ 		var installChunk = (data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			for(var moduleId in moreModules) {
/******/ 				if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			while(chunkIds.length)
/******/ 				installedChunks[chunkIds.pop()] = 1;
/******/ 			parentChunkLoadingFunction(data);
/******/ 		};
/******/ 		__webpack_require__.f.i = (chunkId, promises) => {
/******/ 			// "1" is the signal for "already loaded"
/******/ 			if(!installedChunks[chunkId]) {
/******/ 				if(true) { // all chunks have JS
/******/ 					importScripts(__webpack_require__.p + __webpack_require__.u(chunkId));
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunksdk_web"] = self["webpackChunksdk_web"] || [];
/******/ 		var parentChunkLoadingFunction = chunkLoadingGlobal.push.bind(chunkLoadingGlobal);
/******/ 		chunkLoadingGlobal.push = installChunk;
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!****************************************************************!*\
  !*** ./lib/src/worker/sync/SharedSyncImplementation.worker.js ***!
  \****************************************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _powersync_common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @powersync/common */ "../common/dist/bundle.mjs");
/* harmony import */ var _SharedSyncImplementation__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./SharedSyncImplementation */ "./lib/src/worker/sync/SharedSyncImplementation.js");
/* harmony import */ var _WorkerClient__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./WorkerClient */ "./lib/src/worker/sync/WorkerClient.js");



const _self = self;
const logger = (0,_powersync_common__WEBPACK_IMPORTED_MODULE_0__.createBaseLogger)();
logger.useDefaults();
const sharedSyncImplementation = new _SharedSyncImplementation__WEBPACK_IMPORTED_MODULE_1__.SharedSyncImplementation();
_self.onconnect = async function (event) {
    const port = event.ports[0];
    new _WorkerClient__WEBPACK_IMPORTED_MODULE_2__.WorkerClient(sharedSyncImplementation, port);
};

})();

sdk_web = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=SharedSyncImplementation.umd.js.map