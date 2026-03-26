const fs = require('fs/promises');

class SchemaDecoder {
  #schema = null;

  async loader(file) {
    if (this.#schema) return this.#schema;
    this.#schema = await fs.readFile(file, 'utf8');
    return this.#schema;
  }

  async decoder(schemaFile, payload) {
    const schema = await this.loader(schemaFile);
    return this.#decode(schema, payload);
  }

  async decoderFast(schemaFile, payload) {
    const schema = this.#schema ?? await this.loader(schemaFile);
    return this.#decode(schema, payload);
  }

  async loaderOnly(file) {
    const schema = await this.loader(file);
    return schema;
  }

  async loaderOnlyFast(file) {
    return this.#schema ?? await this.loader(file);
  }

  #decode(schema, payload) {
    const shift = schema.length % 26;
    return payload
      .split('')
      .map((char) => {
        const code = char.charCodeAt(0);
        if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + shift) % 26) + 65);
        if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + shift) % 26) + 97);
        return char;
      })
      .join('');
  }
}

module.exports = SchemaDecoder;
