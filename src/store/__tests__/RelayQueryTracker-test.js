/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @emails oncall+relay
 */

'use strict';

var RelayTestUtils = require('RelayTestUtils');
RelayTestUtils.unmockRelay();

jest.dontMock('RelayQueryTracker');

var Relay = require('Relay');
var RelayQueryPath = require('RelayQueryPath');
var RelayQueryTracker = require('RelayQueryTracker');
var invariant = require('invariant');

describe('RelayQueryTracker', () => {
  var {getNode} = RelayTestUtils;

  function getField(node, ...fieldNames) {
    for (var ii = 0; ii < fieldNames.length; ii++) {
      node = node.getFieldByStorageKey(fieldNames[ii]);
      invariant(
        !!node,
        'getField(): Expected node to have field named `%s`.',
        fieldNames[ii]
      );
    }
    return node;
  }

  beforeEach(() => {
    jest.resetModuleRegistry();

    jest.addMatchers(RelayTestUtils.matchers);
  });

  it('tracks queries for ID-less root records', () => {
    var query = getNode(Relay.QL`
      query {
        viewer {
          actor {
            id
          }
        }
      }
    `);
    var path = new RelayQueryPath(query);
    var tracker = new RelayQueryTracker();

    tracker.trackNodeForID(query, 'client:viewer', path);
    var trackedChildren = tracker.getTrackedChildrenForID('client:viewer');
    expect(trackedChildren.length).toBe(1);
    expect(trackedChildren[0]).toEqualQueryNode(query.getChildren()[0]);
  });

  it('tracks queries for refetchable root records', () => {
    var query = getNode(Relay.QL`
      query {
        node(id:"123") {
          address {
            city
          }
        }
      }
    `);
    var nodeID = '123';
    var path = new RelayQueryPath(query);
    var tracker = new RelayQueryTracker();

    tracker.trackNodeForID(query, nodeID, path);
    var trackedChildren = tracker.getTrackedChildrenForID(nodeID);
    expect(trackedChildren.length).toBe(2);
    query.getChildren().forEach((child, ii) => {
      expect(trackedChildren[ii]).toEqualQueryNode(child);
    });
  });

  it('tracks queries for refetchable records (with IDs)', () => {
    var query = getNode(Relay.QL`
      query {
        viewer {
          actor {
            address {
              city
            }
          }
        }
      }
    `);
    var actor = query.getFieldByStorageKey('actor');
    var actorID = '123';
    var path = new RelayQueryPath(query)
      .getPath(getField(query, 'actor'), actorID);
    var tracker = new RelayQueryTracker();

    tracker.trackNodeForID(actor, actorID, path);
    var trackedChildren = tracker.getTrackedChildrenForID(actorID);
    actor.getChildren().forEach((child, ii) => {
      expect(trackedChildren[ii]).toEqualQueryNode(child);
    });
  });

  it('does not track queries for non-refetchable records', () => {
    var query = getNode(Relay.QL`
      query {
        viewer {
          actor {
            address {
              city
            }
          }
        }
      }
    `);
    var address =
      query.getFieldByStorageKey('actor').getFieldByStorageKey('address');
    var actorID = '123';
    var addressID = 'client:1';
    var path = new RelayQueryPath(query)
      .getPath(getField(query, 'actor'), actorID)
      .getPath(getField(query, 'actor', 'address'), addressID);
    var tracker = new RelayQueryTracker();

    tracker.trackNodeForID(address, addressID, path);
    var trackedChildren = tracker.getTrackedChildrenForID(addressID);
    expect(trackedChildren.length).toBe(0);
  });

  it('untracks all nodes for the given dataID', () => {
    var query = getNode(Relay.QL`
      query {
        viewer {
          actor {
            address {
              city
            }
          }
        }
      }
    `);
    var actor = query.getFieldByStorageKey('actor');
    var actorID = '123';
    var path = new RelayQueryPath(query)
      .getPath(getField(query, 'actor'), actorID);
    var tracker = new RelayQueryTracker();

    tracker.trackNodeForID(actor, actorID, path);
    expect(tracker.getTrackedChildrenForID(actorID)).not.toEqual([]);
    tracker.untrackNodesForID(actorID);
    expect(tracker.getTrackedChildrenForID(actorID)).toEqual([]);
  });
});
