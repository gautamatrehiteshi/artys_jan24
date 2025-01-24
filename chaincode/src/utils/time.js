exports.getTimestamp = (stub) => {
    return stub.getTxTimestamp().seconds.low.toString();
};
