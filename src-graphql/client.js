import GraphQLJSClient from '@shopify/graphql-js-client';
import types from '../types';
import base64Encode from './base64encode';
import './isomorphic-fetch';
import productQuery from './product-query';
import productConnectionQuery from './product-connection-query';
import collectionQuery from './collection-query';
import collectionConnectionQuery from './collection-connection-query';

export default class Client {
  constructor(config, GraphQLClientClass = GraphQLJSClient) {
    const apiUrl = `https://${config.domain}/api/graphql`;
    const authHeader = `Basic ${base64Encode(config.storefrontAccessToken)}`;

    this.graphQLClient = new GraphQLClientClass(types, {
      url: apiUrl,
      fetcherOptions: {
        headers: {
          Authorization: authHeader
        }
      }
    });
  }

  fetchAll(type, list, lastResult, client) {
    list.push(...lastResult.model.shop[type]);

    if (!lastResult.data.shop[type].pageInfo.hasNextPage) {
      return list;
    }

    return client.send(lastResult.model.shop[type].nextPageQuery()).then((response) => {
      return this.fetchAll(type, list, response, client);
    });
  }

  fetchAllProducts(query = productConnectionQuery()) {
    return this.graphQLClient.send(query(this.graphQLClient)).then((response) => {
      return this.fetchAll('products', [], response, this.graphQLClient);
    });
  }

  fetchProduct(id, query = productQuery()) {
    return this.graphQLClient.send(query(this.graphQLClient, id)).then((response) => {
      return response.model.node;
    });
  }

  fetchAllCollections(query = collectionConnectionQuery()) {
    return this.graphQLClient.send(query(this.graphQLClient)).then((response) => {
      return this.fetchAll('collections', [], response, this.graphQLClient);
    });
  }

  fetchCollection(id, query = collectionQuery()) {
    return this.graphQLClient.send(query(this.graphQLClient, id)).then((response) => {
      return response.model.node;
    });
  }
}
