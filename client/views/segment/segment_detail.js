Template.segmentDetail.helpers({
  formatPercent: FormatHelper.formatPercent,
  formatDurationToMin: FormatHelper.formatDurationToMin,

  isMinus: function(num) {
    if (num > 0) {
      return "inc";
    } else if (num == 0) {
      return "";
    } else {
      return "dec";
    }
  }
});

Template.segmentDetail.events({
  "click #showExport": function() {
    var self = this;
    console.log(this);

    console.log("Removing Segment", self.name);
    Notifications.info("Exporting", "Segment " + self.name, {userCloseable: false});

    Meteor.call('getSegmentCsvData', self.segmentId, function(error, result) {
      Notifications.remove({title: "Exporting"});
      if (error) {
        console.error(error);
        Notifications.error('Segment', 'Segment CSV Export failed -- ' + error + ' --');
      } else {
        if (result.length === 0) {
          Notifications.warn('Segment', 'No data to export');
        } else {
          var headings = true;
          var quotes = true;
          var csv = json2csv(result, headings, quotes);
          var uri = "data:text/csv;charset=utf-8," + escape(csv);
          var filename = self.name + "-" + moment().format() + ".csv";
          //window.open has ugly filename
          //use this hacky method to allow customizing filename
          var link = document.createElement('a');
          if (typeof link.download === 'string') {
            document.body.appendChild(link); // Firefox requires the link to be in the body
            link.download = filename;
            link.href = uri;
            link.click();
            document.body.removeChild(link); // remove the link when done
          } else {
            location.replace(uri);
          }
        }
      }
    })
  },
  "click #showInfo": function() {
    Meteor.call("getSegmentCriteriaToString", this.criteria, function(e, msg) {
      $("#criteria").html(msg);
    });
  },
  "click #showDelete": function() {
    var self = this;
    bootbox.confirm("Are you sure you want to remove the segment '" + self.name + "' ?", function(result) {
        if (result) {
            Notifications.info("Removing", "Segment '" + self.name +"'", { userCloseable: false});
            $.blockUI({css : {width:0, height : 0, border:0, backgroundColor : "transparent"}, message : ""});
            Meteor.call("removeInCollection", "Segments", self.segmentId, function (err, res) {
              Notifications.remove({title: "Removing"});
              $.unblockUI();
              var segmentId = res;
              if (err) {
                console.error(err);
                Notifications.error("Removing", "Removal failed -- " + err + " --");
              } else {
                console.info(res);
                Notifications.success("Removed", "Segment '"+self.name + "'. Redirecting to segment list...");
                Router.go('segment.list');
              }
            });
        }
    });
  }
});
Template.segmentDetail.rendered = function(e,tmpl) {

  var self = this;

  if (self && self.data) {
    DateHelper.setUpDatePicker(self.data.from, self.data.to);
  }
  var setVisitorCharts = function() {

    //stupid this.data is not reactive
    var data = Router.current().data().graphVisitorsXDatesData;

    if (!data) {
      $("#graphVisitorsXDates").empty();
      return;
    }

    //Visitor Chart by Date
    c3.generate({
      bindto: "#graphVisitorsXDates",
      data: {
        json: data,
        keys : {
          x : 'date',
          value: ['number of visitors']
        },
        type: 'bar',
        colors : {
          "number of visitors": "#CFD8DC"
        }
      },
      axis: {
        x : {
          label: {
            text : 'Date',
            position: 'outer-right'
          },
          type : 'timeseries',
          tick : {
            format : function(x) { return moment(x).format('YYYY-MM-DD')},
            culling: { max: 10 }
          }
        },
        y: {
          label: {
            text: 'Number of Visitors',
            position: 'outer-middle'
          }
        }
      },
      legend: {
        position: 'right',
        show: false
      },
      bar: {
        width: {
          ratio: 0.2
        }
      },
      grid: {
        y :  {
          show: true
        }
      }
    });
  }

  var setDwellTimeCharts = function(){
    //Dwell time chart

    //stupid this.data is not reactive
    var data = Router.current().data().graphVisitorsXDwellData;

    if (!data) {
      $("#graphVisitorsXDwell").empty();
      return;
    }

    c3.generate({
      bindto: "#graphVisitorsXDwell",
      data: {

        json: data,

        keys : {
          x : 'duration',
          value: ['number of visitors']
        },
        type: 'bar',
        colors : {
          "number of visitors": "#CFD8DC"
        },
      },
      axis: {
        x : {
          label: {
            text : "Minutes",
            position: 'outer-right'
          },
          type : 'category',
          tick : {
            format: function (d) { return d+" min"; },
            culling: { max: 10 }
          }
        },
        y: {
          label: {
            text: 'Number of Visitors',
            position: 'outer-middle'
          }
        }
      },
      legend: {
        position: 'right',
        show: false
      },
      bar: {
        width: {
          ratio: 1
        }
      },
      grid: {
        y :  {
          show: true
        }
      }
    });

  };

  var setRepeatedVisitorCharts = function() {

    //stupid this.data is not reactive
    var data = Router.current().data().graphVisitorsXVisitsData;

    if (! data) {
      $("#graphVisitorsXVisits").empty();
      return;
    }

    // Repeated Visitor Chart
    c3.generate({
      bindto: "#graphVisitorsXVisits",
      data: {
        json: data,

        keys : {
          x : 'count',
          value: ['number of visitors']
        },
        type: 'bar',
        colors : {
          "number of visitors": "#CFD8DC"
        }
      },
      axis: {
        x : {
          label: {
            text : 'Number of Visits',
            position: 'outer-right',
          },
          tick : {
            culling: { max: 10 }
          },
        },
        y: {
          label: {
            text: 'Number of Visitors',
            position: 'outer-middle'
          }
        }
      },
      legend: {
        position: 'right',
        show: false
      },
      bar: {
        width: {
          ratio: 0.2
        }
      },
      grid: {
        y :  {
          show: true
        }
      }
    });
  }

  $(".metric-tabs a[data-toggle='tab']").on("click", function(e){
    // e.target // newly activated tab
      // e.relatedTarget // previous active tab
      var currentTab = $(e.currentTarget);
      var target = currentTab.attr("href")
      if (currentTab.data("init")){
        return true;
      } else {
        if (target === "#dwell-time-metrics") {
          self.autorun(Meteor.defer(function () {
            setDwellTimeCharts();
            var dwellEnterData = Router.current().data().graphDistributionDwellEnterData;
            var operatingTime = Router.current().data().operatingTime;
            ChartHelper.punchCard("#graphDistributionDwellEnter", dwellEnterData, operatingTime);

          }));
        } else if (target === "#repeated-visits-metrics") {
          self.autorun(Meteor.defer(
              function() {
                setRepeatedVisitorCharts();
                var graphDistributionVisitsEnterData = Router.current().data().graphDistributionVisitsEnterData;
                var graphDistributionVisitsExitData = Router.current().data().graphDistributionVisitsExitData;
                var operatingTime = Router.current().data().operatingTime;

                ChartHelper.punchCard("#graphDistributionVisitsEnter", graphDistributionVisitsEnterData, operatingTime);
                ChartHelper.punchCard("#graphDistributionVisitsExit", graphDistributionVisitsExitData, operatingTime);
              })
          );
        }
        //do nothing for the visitor tabs

        currentTab.data("init", true)
        return true;
      }
  })

  //init
  self.autorun(setVisitorCharts);
  
}

