// do not use import, otherwise other test units won't be able to reactivate nock
const nock = require('nock');

const {assert} = require('chai');
const {range} = require('ramda');

const {
    assertResponseStatus,
    elasticsearchConnections,
    getResponseJson
} = require('./utils.js');

const {
    query, connect, elasticsearchMappings
} = require('../../src/datastores/index');

describe('Elasticsearch v5:', function () {
    let url;

    before(function() {
        url = `${elasticsearchConnections.host}:${elasticsearchConnections.port}`;

        // Enable nock if it has been disabled by other specs
        if (!nock.isActive()) nock.activate();

        // Uncomment to test dockerized server:
        //
        // elasticsearchConnections.host = 'http://localhost';
        // elasticsearchConnections.port = '9200';
        // nock.restore();
    });

    after(function() {
        nock.restore();
    });

    const expectedMappingsResponse = {
        'test-types': {
            'mappings': {
                'elastic-2.4-types': {
                    'properties': {
                        'boolean': {'type': 'boolean'},
                        'date': {'type': 'date'},
                        'double': {'type': 'double'},
                        'geo_point-1': {'type': 'geo_point'},
                        'geo_point-2': {'type': 'geo_point'},
                        'geo_point-3': {'type': 'geo_point'},
                        'integer': {'type': 'integer'},
                        'ip': {'type': 'ip'},
                        'string-1': {'type': 'text'},
                        'string-2': {'type': 'text'},
                        'token': {'analyzer': 'standard', 'type': 'token_count'}
                    }
                }
            }
        },
        'test-scroll': {
            'mappings': {
                '200k': {
                    'properties': {
                        'Column 1': {'type': 'double'},
                        'Column 2': {'type': 'double'},
                        'Column 3': {'type': 'double'},
                        'Column 4': {'type': 'double'}
                    }
                }
            }
        },
        'live-data': {
            'mappings': {
                'test-type': {
                    'properties': {
                        'boolean': {'type': 'boolean'},
                        'date': {'type': 'date'},
                        'double': {'type': 'double'},
                        'geo_point-1': {'type': 'geo_point'},
                        'geo_point-2': {'type': 'geo_point'},
                        'geo_point-3': {'type': 'geo_point'},
                        'integer': {'type': 'integer'},
                        'ip': {'type': 'ip'},
                        'string-1': {'type': 'text'},
                        'string-2': {'type': 'text'},
                        'token': {'analyzer': 'standard', 'type': 'token_count'}
                    }
                }
            }
        },
        'plotly_datasets': {
            'mappings': {
                'consumer_complaints': {
                    'properties': {
                        'Company': {'type': 'text'},
                        'Company response': {'type': 'text'},
                        'Complaint ID': {'type': 'integer'},
                        'Consumer disputed?': {'type': 'text'},
                        'Date received': {'type': 'date', 'format': 'strict_date_optional_time'},
                        'Date sent to company': {'type': 'date', 'format': 'strict_date_optional_time'},
                        'Issue': {'type': 'text'},
                        'Product': {'type': 'text'},
                        'State': {'type': 'text'},
                        'Sub-issue': {'type': 'text'},
                        'Sub-product': {'type': 'text'},
                        'Timely response?': {'type': 'text'},
                        'ZIP code': {'type': 'integer'}
                    }
                },
                'ebola_2014': {
                    'properties': {
                        'Country': {'type': 'text'},
                        'Lat': {'type': 'float'},
                        'Lon': {'type': 'float'},
                        'Month': {'type': 'integer'},
                        'Value': {'type': 'float'},
                        'Year': {'type': 'integer'},
                        'index': {'type': 'integer'}
                    }
                }
            }
        },
        'sample-data': {
            'mappings': {
                'test-ranges': {
                     'properties': {
                         'Date': {'type': 'date'},
                         'Float': {'type': 'float'},
                         'Integer': {'type': 'integer'},
                         'Ipv4': {'type': 'ip'},
                         'String': {'type': 'text'}
                     }
                },
                'test-type': {
                    'properties': {
                        'my-boolean-1': {'type': 'boolean'},
                        'my-boolean-2': {'type': 'boolean'},
                        'my-date-1': {'type': 'date'},
                        'my-date-2': {'type': 'date'},
                        'my-geo-point-1': {'type': 'geo_point'},
                        'my-geo-point-2': {'type': 'geo_point'},
                        'my-number-1': {'type': 'long'},
                        'my-number-2': {'type': 'long'},
                        'my-string-1': {'type': 'text'},
                        'my-string-2': {'type': 'text'}
                    }
                },
                'test-scroll': {
                    'properties': {
                        'fifth': {'type': 'float'},
                        'first': {'type': 'float'},
                        'fourth': {'type': 'float'},
                        'second': {'type': 'float'},
                        'third': {'type': 'float'}
                    }
                }
            }
        }
    };

    it('connect returns a list of indices', function() {
        const expectedConnectResponse = [
            {
                health: 'yellow',
                status: 'open',
                index: 'test-types',
                'docs.count': '3',
                'docs.deleted': '0'
            }, {
                health: 'yellow',
                status: 'open',
                index: 'plotly_datasets',
                'docs.count': '0',
                'docs.deleted': '0'
            }, {
                health: 'yellow',
                status: 'open',
                index: 'test-scroll',
                'docs.count': '200000',
                'docs.deleted': '0'
            }, {
                health: 'yellow',
                status: 'open',
                index: 'live-data',
                'docs.count': '0',
                'docs.deleted': '0'
            }, {
                health: 'yellow',
                status: 'open',
                index: 'sample-data',
                'docs.count': '11',
                'docs.deleted': '0'
            }
        ];

        // mock connect response
        nock(url)
        .get('/_cat/indices/?format=json')
        .reply(200, expectedConnectResponse);

        return connect(elasticsearchConnections)
        .then(assertResponseStatus(200))
        .then(getResponseJson)
        .then(json => {
            const obtained = {};
            json.forEach(index => {
                obtained[index.index] = index;
            });

            expectedConnectResponse.forEach(expectedIndex => {
                assert.deepInclude(
                    obtained[expectedIndex.index],
                    expectedIndex,
                    `Unexpected result for ${expectedIndex.index}`
                );
            });
        });
    });

    it('elasticsearchMappings returns mappings', function() {
        // mock elasticsearchMappings response
        nock(url)
        .get('/_all/_mappings?format=json')
        .reply(200, expectedMappingsResponse);

        return elasticsearchMappings(elasticsearchConnections)
        .then(json => {
            Object.keys(expectedMappingsResponse).forEach(index => {
                assert.deepEqual(
                    json[index],
                    expectedMappingsResponse[index],
                    `Unexpected mappings in index ${index}`
                );
            });
        });
    });

    it('query queries an elasticsearch index', function() {
        // mock elasticsearchMappings response
        nock(url)
        .get('/_all/_mappings?format=json')
        .reply(200, expectedMappingsResponse);


        // mock query response
        nock(url)
        .post('/test-types/elastic-2.4-types/_search?format=json')
        .reply(200, {
            took: 1,
            timed_out: false,
            _shards: { total: 5, successful: 5, skipped: 0, failed: 0 },
            hits: {
                total: 3,
                max_score: 1,
                hits: [{
                    _index: 'test-types',
                    _type: 'elastic-2.4-types',
                    _id: '2',
                    _score: 1,
                    _source: {
                        ip: '208.49.20.91',
                        'geo_point-2': '73.4598645169,94.969768064',
                        double: 0.04016600628707845,
                        token: 'Winston Aubrey Perla',
                        boolean: true,
                        'string-1': 'meters recruiter chases villages platter',
                        'string-2': 'South Africa',
                        'geo_point-3': [ 94.96976806404194, 73.45986451687563 ],
                        date: '2016-12-04T16:04:43.816943-05:00',
                        integer: 1,
                        'geo_point-1': { lat: 73.45986451687563, lon: 94.96976806404194 }
                    }
                }, {
                    _index: 'test-types',
                    _type: 'elastic-2.4-types',
                    _id: '1',
                    _score: 1,
                    _source: {
                        ip: '205.7.19.54',
                        'geo_point-2': '-45.0649063041,-11.9183865969',
                        double: 0.6310475331632162,
                        token: 'Hector Jai Brenna Mary Gabrielle',
                        boolean: true,
                        'string-1': 'connection harmonies camp loss customs',
                        'string-2': 'Cyprus',
                        'geo_point-3': [ -11.918386596878577, -45.06490630412356 ],
                        date: '2016-12-04T16:05:13.816943-05:00',
                        integer: 0,
                        'geo_point-1': { lat: -45.06490630412356, lon: -11.918386596878577 }
                    }
                }, {
                    _index: 'test-types',
                    _type: 'elastic-2.4-types',
                    _id: '3',
                    _score: 1,
                    _source: {
                        ip: '134.119.173.12',
                        'geo_point-2': '57.491330009,-28.0041090462',
                        double: 0.4387754352694577,
                        token: 'Jorge Arthur Scott Kaleigh Chad Roanne',
                        boolean: true,
                        'string-1': 'kites clump circles reduction parcel',
                        'string-2': 'Angola',
                        'geo_point-3': [ -28.004109046235016, 57.4913300090476 ],
                        date: '2016-12-04T16:04:13.816943-05:00',
                        integer: 2,
                        'geo_point-1': { lat: 57.4913300090476, lon: -28.004109046235016 }
                    }
                }]
            }
        });

        return query(JSON.stringify({
                body: {
                    query: {
                        query_string: {
                            query: '*'
                        }
                    },
                    from: 0,
                    size: 1000
                },
                index: 'test-types',
                type: 'elastic-2.4-types'
            }),
            elasticsearchConnections
        ).then(results => {
            const expected = {
                'columnnames': [
                    'boolean',
                    'date',
                    'double',
                    'geo_point-1 (lat)',
                    'geo_point-1 (lon)',
                    'geo_point-2 (lat)',
                    'geo_point-2 (lon)',
                    'geo_point-3 (lat)',
                    'geo_point-3 (lon)',
                    'integer',
                    'ip',
                    'string-1',
                    'string-2',
                    'token'
                ],
                'rows': [[
                    true,
                    '2016-12-04T16:05:13.816943-05:00',
                    0.6310475331632162,

                    // original form: {lat: -45.0..., lon: -11.9...}
                    -45.06490630412356,
                    -11.918386596878577,

                    // original form '-45.0..,-11.91...'
                    -45.0649063041,
                    -11.9183865969,

                    // original form: [-11.9..., -45.0...]
                    -45.06490630412356,
                    -11.918386596878577,

                    0,
                    '205.7.19.54',
                    'connection harmonies camp loss customs',
                    'Cyprus',
                    'Hector Jai Brenna Mary Gabrielle'
                ], [
                    true,
                    '2016-12-04T16:04:43.816943-05:00',
                    0.04016600628707845,

                    73.45986451687563,
                    94.96976806404194,

                    73.4598645169,
                    94.969768064,

                    73.45986451687563,
                    94.96976806404194,

                    1,
                    '208.49.20.91',
                    'meters recruiter chases villages platter',
                    'South Africa',
                    'Winston Aubrey Perla'
                ], [
                    true,
                    '2016-12-04T16:04:13.816943-05:00',
                    0.4387754352694577,

                    57.4913300090476,
                    -28.004109046235016,

                    57.491330009,
                    -28.0041090462,

                    57.4913300090476,
                    -28.004109046235016,

                    2,
                    '134.119.173.12',
                    'kites clump circles reduction parcel',
                    'Angola',
                    'Jorge Arthur Scott Kaleigh Chad Roanne'
                ]]
            };

            assert.deepEqual(results.columnnames, expected.columnnames, 'Unexpected column names');

            // account for changes in row order
            assert.deepEqual(results.rows.length, expected.rows.length, 'Unexpected number of rows');
            expected.rows.forEach(row => {
                assert.deepInclude(results.rows, row, 'Missing row');
            });
        });
    });

    it('query queries an elasticsearch index and limits the size', function() {
        // mock elasticsearchMappings response
        nock(url)
        .get('/_all/_mappings?format=json')
        .reply(200, expectedMappingsResponse);


        // mock query response
        nock(url)
        .post('/sample-data/test-type/_search?format=json')
        .reply(200, {
            took: 2,
            timed_out: false,
            _shards: { total: 5, successful: 5, skipped: 0, failed: 0 },
            hits: {
               total: 11,
               max_score: 1,
               hits: [{
                   _index: 'sample-data',
                   _type: 'test-type',
                   _id: '0',
                   _score: 1,
                   _source: {
                       'my-date-1': '2015-01-01T12:30:40Z',
                       'my-string-1': 'NYC',
                       'my-string-2': 'USA',
                       'my-date-2': '1915-01-01T12:30:40Z',
                       'my-number-1': 1,
                       'my-number-2': 10,
                       'my-geo-point-2': [ -10, -10 ],
                       'my-geo-point-1': [ 10, 10 ],
                       'my-boolean-2': true,
                       'my-boolean-1': true
                   }
               }]
            }
        });

        return query(JSON.stringify(
            {
                body: {
                    query: {
                        query_string: {
                            query: '*'
                        }
                    },
                    size: '1'
                },
                index: 'sample-data',
                type: 'test-type'
            }),
            elasticsearchConnections
        ).then(results => {
            const expected = {
                columnnames: [
                    'my-boolean-1', 'my-boolean-2',
                    'my-date-1', 'my-date-2',
                    'my-geo-point-1 (lat)', 'my-geo-point-1 (lon)',
                    'my-geo-point-2 (lat)', 'my-geo-point-2 (lon)',
                    'my-number-1', 'my-number-2',
                    'my-string-1', 'my-string-2'
                ],
                rows: [[
                    true,
                    true,
                    '2015-01-01T12:30:40Z',
                    '1915-01-01T12:30:40Z',
                    10,
                    10,
                    -10,
                    -10,
                    1,
                    10,
                    'NYC',
                    'USA'
                ]]
            };

            assert.deepEqual(results, expected);
        });
    });

    it('query can return more than 10K rows', function() {
        // mock elasticsearchMappings response
        nock(url)
        .get('/_all/_mappings?format=json')
        .reply(200, expectedMappingsResponse);


        // mock query response
        nock(url)
        .post('/test-scroll/200k/_search?format=json&scroll=1m')
        .reply(200, {
            /* eslint-disable max-len */
            _scroll_id: 'DnF1ZXJ5VGhlbkZldGNoBQAAAAAAAAKtFlRNTXhmVUYzVFN1anE2TWdJM1ZLamcAAAAAAAACrhZUTU14ZlVGM1RTdWpxNk1nSTNWS2pnAAAAAAAAArAWVE1NeGZVRjNUU3VqcTZNZ0kzVktqZwAAAAAAAAKxFlRNTXhmVUYzVFN1anE2TWdJM1ZLamcAAAAAAAACrxZUTU14ZlVGM1RTdWpxNk1nSTNWS2pn',
            /* eslint-enable max-len */
             took: 83,
             timed_out: false,
             _shards: { total: 5, successful: 5, skipped: 0, failed: 0 },
             hits: {
                 total: 200000,
                 max_score: 1,
                 hits: range(1, 10001 + 1).map(i => {
                     return {
                         _index: 'test-scroll',
                         _type: '200k',
                         _id: `${i}`,
                         _score: 1,
                         _source: {
                             'Column 4': i + 0.4,
                             'Column 2': i + 0.2,
                             'Column 3': i + 0.3,
                             'Column 1': i + 0.1
                         }
                     };
                 })
             }
        });

        return query(JSON.stringify(
            {
                body: {
                    query: {
                        query_string: {
                            query: '*'
                        }
                    },
                    size: '10001'
                },
                index: 'test-scroll',
                type: '200k'
            }),
            elasticsearchConnections
        ).then(results => {
            const expectedColumnnames = [
                'Column 1',
                'Column 2',
                'Column 3',
                'Column 4'
            ];
            assert.deepEqual(results.columnnames, expectedColumnnames, 'Unexpected column names');

            // account for changes in row order
            assert.equal(results.rows.length, 10001, 'Unexpected number of rows');
            results.rows.forEach(row => {
                assert.equal(row.length, expectedColumnnames.length, 'Unexpected number of columns');

                const offset = 10 * Math.trunc(row[0]);
                const decimals = row.map(x => Math.trunc(10 * x - offset));
                assert.deepEqual(decimals, [1, 2, 3, 4], `Invalid row ${row}`);
            });
        });
    });

    it('query returns all the data when requested size is larger than the dataset', function() {
        // mock elasticsearchMappings response
        nock(url)
        .get('/_all/_mappings?format=json')
        .reply(200, expectedMappingsResponse);


        // mock query response
        nock(url)
        .post('/test-scroll/200k/_search?format=json&scroll=1m')
        .reply(200, {
            /* eslint-disable max-len */
            _scroll_id: 'DnF1ZXJ5VGhlbkZldGNoBQAAAAAAAAKtFlRNTXhmVUYzVFN1anE2TWdJM1ZLamcAAAAAAAACrhZUTU14ZlVGM1RTdWpxNk1nSTNWS2pnAAAAAAAAArAWVE1NeGZVRjNUU3VqcTZNZ0kzVktqZwAAAAAAAAKxFlRNTXhmVUYzVFN1anE2TWdJM1ZLamcAAAAAAAACrxZUTU14ZlVGM1RTdWpxNk1nSTNWS2pn',
            /* eslint-enable max-len */
             took: 529,
             timed_out: false,
             _shards: { total: 5, successful: 5, skipped: 0, failed: 0 },
             hits: {
                 total: 200000,
                 max_score: 1,
                 hits: range(1, 200000 + 1).map(i => {
                     return {
                         _index: 'test-scroll',
                         _type: '200k',
                         _id: `${i}`,
                         _score: 1,
                         _source: {
                             'Column 4': i + 0.4,
                             'Column 2': i + 0.2,
                             'Column 3': i + 0.3,
                             'Column 1': i + 0.1
                         }
                     };
                 })
             }
        });

        return query(JSON.stringify(
            {
                body: {
                    query: {
                        query_string: {
                            query: '*'
                        }
                    },
                    size: '200001'
                },
                index: 'test-scroll',
                type: '200k'
            }),
            elasticsearchConnections
        ).then(results => {
            const expectedColumnnames = [
                'Column 1',
                'Column 2',
                'Column 3',
                'Column 4'
            ];
            assert.deepEqual(results.columnnames, expectedColumnnames, 'Unexpected column names');

            // account for changes in row order
            assert.equal(results.rows.length, 200 * 1000, 'Unexpected number of rows');
            results.rows.forEach(row => {
                assert.equal(row.length, expectedColumnnames.length, 'Unexpected number of columns');

                const offset = 10 * Math.trunc(row[0]);
                const decimals = row.map(x => Math.trunc(10 * x - offset));
                assert.deepEqual(decimals, [1, 2, 3, 4], `Invalid row ${row}`);
            });
        });
    });

    it('query returns valid aggregated data', function() {
        // mock elasticsearchMappings response
        nock(url)
        .get('/_all/_mappings?format=json')
        .reply(200, expectedMappingsResponse);


        // mock query response
        nock(url)
        .post('/sample-data/test-type/_search?format=json')
        .reply(200, {
            took: 2,
            timed_out: false,
            _shards: { total: 5, successful: 5, skipped: 0, failed: 0 },
            hits: {
                total: 11,
                max_score: 1,
                hits: [{
                    _index: 'sample-data',
                    _type: 'test-type',
                    _id: '0',
                    _score: 1,
                    _source: {
                        'my-date-1': '2015-01-01T12:30:40Z',
                        'my-string-1': 'NYC',
                        'my-string-2': 'USA',
                        'my-date-2': '1915-01-01T12:30:40Z',
                        'my-number-1': 1,
                        'my-number-2': 10,
                        'my-geo-point-2': [ -10, -10 ],
                        'my-geo-point-1': [ 10, 10 ],
                        'my-boolean-2': true,
                        'my-boolean-1': true }
                }, {
                    _index: 'sample-data',
                    _type: 'test-type',
                    _id: '5',
                    _score: 1,
                    _source: {
                        'my-date-1': '2016-01-10T06:05:02Z',
                        'my-string-1': 'Tokyo',
                        'my-string-2': 'Japan',
                        'my-date-2': '1916-01-10T06:05:02Z',
                        'my-number-1': 6,
                        'my-number-2': 60,
                        'my-geo-point-2': [ -30, -30 ],
                        'my-geo-point-1': [ 30, 30 ],
                        'my-boolean-2': false,
                        'my-boolean-1': true
                    }
                }]
            },
            aggregations: { agg1: { buckets: [
                { key: 0, doc_count: 9, agg2: { value: 450 } },
                { key: 10, doc_count: 2, agg2: { value: 210 } }
            ]}}
        });

        return query(JSON.stringify(
            {
                body: {
                    'query': {
                        'query_string': {
                            'query': '*'
                        }
                    },
                    'aggs': {
                        'agg1': {
                            'histogram': {
                                'interval': 10,
                                'field': 'my-number-1'
                            },
                            'aggs': {
                                'agg2': {
                                    'sum': {
                                        'field': 'my-number-2'
                                    }
                                }
                            }
                        }
                    },
                    'size': 2
                },
                index: 'sample-data',
                type: 'test-type'
            }),
            elasticsearchConnections
        ).then(results => {
            assert.deepEqual(results, {
                columnnames: [
                    'my-number-1',
                    'sum of my-number-2'
                ],
                rows: [
                    [0, 450],
                    [10, 210]
                ]
            });
        });
    });
});
