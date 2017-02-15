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

  fetchAll(paginatedModels) {
    return this.graphQLClient.fetchNextPage(paginatedModels).then(({model}) => {
      // Until we know how hasNextPage will be exposed, we query until the result is empty
      if (model.length === 0) {
        return paginatedModels;
      }

      paginatedModels.push(...model);

      return this.fetchAll(paginatedModels);
    });
  }

  fetchAllProducts(query = productConnectionQuery()) {
    return this.graphQLClient.send(query(this.graphQLClient)).then(({model, data}) => {
      const promises = model.shop.products.reduce((promiseAcc, product, i) => {
        if (data.shop.products.edges[i].node.images.pageInfo.hasNextPage) {
          promiseAcc.push(this.fetchAll(product.images));
        }

        if (data.shop.products.edges[i].node.variants.pageInfo.hasNextPage) {
          promiseAcc.push(this.fetchAll(product.variants));
        }

        return promiseAcc;
      }, []);

      return Promise.all(promises).then(() => {
        return model.shop.products;
      });
    });
  }

  fetchProduct(id, query = productQuery()) {
    return this.graphQLClient.send(query(this.graphQLClient, id)).then((response) => {
      const promises = [];

      // Fetch the rest of the images for this product
      if (response.data.node.images.pageInfo.hasNextPage) {
        promises.push(this.fetchAll(response.model.node.images));
      }

      // Fetch the rest of the variants for this product
      if (response.data.node.variants.pageInfo.hasNextPage) {
        promises.push(this.fetchAll(response.model.node.variants));
      }

      return Promise.all(promises).then(() => {
        return response.model.node;
      });
    });
  }

  fetchAllCollections(query = collectionConnectionQuery()) {
    return this.graphQLClient.send(query(this.graphQLClient)).then((response) => {
      return response.model.shop.collections;
    });
  }

  fetchCollection(id, query = collectionQuery()) {
    return this.graphQLClient.send(query(this.graphQLClient, id)).then((response) => {
      return response.model.node;
    });
  }
}
