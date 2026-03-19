function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    jsonPayload: null,
    sentPayload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
      return this;
    },
    json(payload) {
      this.jsonPayload = payload;
      return this;
    },
    send(payload) {
      this.sentPayload = payload;
      return this;
    }
  };
}

module.exports = { createResponse };
