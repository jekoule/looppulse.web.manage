SegmentVisitors = new Meteor.Collection("segment_visitors", {
  transform: function(doc) {
    return new SegmentVisitor(doc);
  }
});

/**
 *
 * @param doc
 * @constructor
 *
 * @property segmentId
 * @property visitorId
 */
SegmentVisitor = function(doc) {
  _.extend(this, doc);
};

SegmentVisitor.startup = function() {
  Encounters.find().observe({
    _suppress_initial: true,
    "added": handleEncounterAdded,
    "changed": handleEncounterChanged
  });
};

var handleEncounterAdded = function(encounter) {
  updateSegmentVisitors(encounter);
  Engagement.dispatch(encounter);
};

var handleEncounterChanged = function(encounter, oldEncounter) {
  updateSegmentVisitors(encounter);
  Engagement.dispatch(encounter);
};

var updateSegmentVisitors = function(encounter) {
  SegmentVisitors.find({
    visitorId: encounter.visitorId
  }).map(function(segmentVisitor) {
    var segment = Segments.findOne(segmentVisitor.segmentId);
    var visitor = Visitors.findOne(segmentVisitor.visitorId);
    if (!segment.match(visitor)) {
      SegmentVisitors.remove(segmentVisitor._id);
    }
  });

  Segments.find().map(function(segment) {
    var visitor = Visitors.findOne(encounter.visitorId);
    if (segment.match(visitor)) {
      SegmentVisitors.upsert({
        segmentId: segment._id,
        visitorId: encounter.visitorId
      }, {});
    }
  });
};