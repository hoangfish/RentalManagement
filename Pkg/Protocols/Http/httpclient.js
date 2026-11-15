// Interface (counterpart of Interfaces/httpclient.h)
export class HttpClient {
  async sendGetRequest(/* url */) { throw new Error('Not implemented'); }
  async sendPostRequest(/* url, json */) { throw new Error('Not implemented'); }
  async sendPutRequest(/* url, json */) { throw new Error('Not implemented'); }
  async sendPatchRequest(/* url, json */) { throw new Error('Not implemented'); }
  async sendDeleteRequest(/* url */) { throw new Error('Not implemented'); }
  // multipart/form-data (file uploads). method: 'POST' | 'PATCH'
  async sendFormRequest(/* method, url, formData */) { throw new Error('Not implemented'); }
}
