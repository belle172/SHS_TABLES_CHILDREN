// Table of contents:
  //
  // Interactive functionality --------------------------------------------------
  // Data tables initialization -------------------------------------------------
  //
  // DATA: update ---------------------------------------------------------------
  // Levels selection -----------------------------------------------------------
  // Row highlighting - Pivot tables only ---------------------------------------
  // Show SEs (+check control totals) -------------------------------------------
  //
  // TABLE TAB ------------------------------------------------------------------
  //  Export table to csv
//
  // PLOT TAB -------------------------------------------------------------------
  //  Export plot to png
  // HAS QUARTERLY UPDATES ADDED
//
  // CODE TAB -------------------------------------------------------------------
  //  Export code to text files
//
  // Caption, Citation, Notes ---------------------------------------------------
  // Trigger --------------------------------------------------------------------
  
  $(document).ready(function() {
    
    /* Do not do this
    $.ajaxSetup({ async: false });
    */
      
      $('#meps-table').hide(); // hide until new data is imported
    
  

  
  
    // Interactive functionality --------------------------------------------------
      
      var isTrend = true;
      $('#data-view').change(function(){
        isTrend = $(this).find('input[value="trend"]').is(':checked');
        if(isTrend){
          $('.hide-if-trend').slideUp('slow');
          $('.year-start').animate({width: '100%'},400);
          $('.year-main label').text('to:');
        }else{
          $('.hide-if-trend').slideUp('slow');
          $('.year-start').animate({width:'0%'},400);
          $('.year-main label').text('Year:');
        }
      });
      
      // Prevent 'reset' button from closing dropdown
      $('.dropdown-menu').on('click', function(e) {
        if($(this).hasClass('dropdown-menu-form')) { e.stopPropagation(); }
      });
      
      // Custom search box
      $('#search').on('keyup change', function() {
        table.column(2).search($(this).val()).draw();
      });
      
      // Reactivity based on active tab
      var activeTab = 'table-pill';
      $('#meps-tabs li a').on('click', function(){
        // guard against plotting when disabled
        if(!$(this).hasClass('disabled')) { activeTab = $(this).attr('id'); }
        switch(activeTab) {
          case 'table-pill': $(document).trigger("updateTable"); break;
          case 'plot-pill' : $(document).trigger("updatePlot");  break;
          case 'code-pill' : $(document).trigger("updateCode");  break;
        }
      });
      
      // Data tables initialization -------------------------------------------------
        // Options that we're not using:
      //scrollY: "500px", scrollX: true, scrollCollapse: true,
      //paging: isPivot, // this will slow initiation
      //select: {style: 'multi'},
      //autoWidth: true,
      //deferRender: true,
      //searching: false,
      
      // var table = $('#meps-table').DataTable();
      
      // Get year range
      var nrows = 0;
      $("#year option").each(function(){nrows = nrows + 1;});
      
      // Initiate data tables
      var ncols = initCols.length;
      var selectedLevels = Object.assign({}, initLevels);
      var initData = [Array.apply(null, Array(ncols)).map(function(x) {return null;})];
      var table = $('#meps-table').DataTable( {
        data: initData,
        dom: 'lrtp',
        orderClasses: false,
        lengthChange: false,
        ordering: isPivot,
        pageLength: isPivot ? 10 : nrows,
        columns: initCols
      });
      
      // After initial tables have loaded, hide overlay and show table (initially hidden in css)
      $('.dataTable').wrap('<div class="dataTables_scroll" />');
      $('#loading').hide();
      // After initial tables have loaded, hide DEMOGRAPHIC STUB VARIABLES
      //$('#col_var').show();
      $('#dl-table').show();
      
      if(!isPivot) {
        $('.dataTables_paginate').addClass('hidden');
      }
      
      // DATA: update ---------------------------------------------------------------
        var newData, colNames, colClasses, stat_var, col_var, colX, row_var, rowX;
      var newCaption = "Medical Expenditure Panel Survey";
      var year, yearStart, rowYears, colYears;
      var rcEqual = false, highlightedRows = {};
      
      $('#stat_var, #col_var, #row_var, #year, #year-start, #data-view, .subgrp').on('change', function() {
        $(document).trigger("updateValues");
      });
      
      $(document).on('updateValues', function() {
        stat_var = $('#stat_var').val();
        
        // get subgrp key by checking for (by ___) in statName;
        $('.subgrp').hide();
        statName = $('#stat_var option:selected').text();
        any_sG = statName.match(/\(by([^)]+)\)/);
      if(any_sG !== null) {
        //sG_key = any_sG[1].trim().replaceAll(" ","");
        sG_key = stat_var.split("_")[0];
        $('#'+sG_key).show();
        $("input:radio[name="+sG_key+"]").each(function(){
          if($(this).is(":checked")) {
            subGrp = $(this).val();
          }
        });
        console.log(subGrp);
      } else {
        subGrp = "";
      }
      
      year = $('#year').val();
      yearStart = $('#year-start').val();
    //var yearsRegex = range(yearStart, year).join("|");

 // Check if year strings are quarterly:  
  is_quarterly = year.includes("J", "M");  
   // is_quarterly = year.includes("Q","A");  
 
  
   // Convert quarterly year strings to numeric, then get range based on start/end date  
     if(is_quarterly) {  
       q_yearStart = qtr_to_num(yearStart);  
       q_year = qtr_to_num(year);  
     q_range = range(q_yearStart, q_year, by = 0.5); 
  
        //  q_range = range(q_yearStart, q_year, by = 0.25);  
  // q_range = range(q_yearStart, q_year, by = 1); 
  
     yearsRegex = q_range.map(num_to_qtr).join("|"); 
    // yearsRegex = yearsRegex22;
     } else {  
       yearsRegex = range(yearStart, year).join("|");   
     }  

      var yrX  = isTrend ? yearsRegex : year;
      rowYears = isPivot ? 'All': yrX;
      colYears = isPivot ? yrX : '__';
      
      col_var = $('#col_var').val();
      colX = isTrend &&  isPivot ? 'ind' : col_var;
      
      row_var = $('#row_var').val();
      rowX = isTrend && !isPivot ? 'ind' : row_var;
      
      rcEqual = (rowX == colX && rowX != 'ind');
      if(rcEqual) { rowX = 'ind'; }
      
      $(document).trigger("updateData");
      if(activeTab == 'code-pill'){ $(document).trigger("updateCode"); }
      });

var filename1;
var newCaption2;
var newCaption3;
var colLevels = {}, rowLevels = {};

$(document).on('updateData', function() {
  $('#updating-overlay').show();
  
  filename1 = stat_var + '__' + rowX + '__' + colX + '__' + subGrp;
    $.getJSON( filename1 + '.json', function(data) {
//  $.getJSON('json/data/' + filename1 + '.json', function(data) {
    $('#updating-overlay').hide();
    newData = data.data;
    newCaption = data.caption[0];
    newCaption2 = data.caption2[0];
    newCaption3 = data.caption3[0];
    var newNames = data.names;
    var newClasses = data.classes;
    
    // Subset to year cols (for pivot)
    var showCols = grepIndexes(newClasses, [colYears], force = [0, 1, 2, 3, 4]);
    colNames = selectIndexes(newNames, showCols);
    colClasses = selectIndexes(newClasses, showCols);
    
    // Update table
    var subData = selectCols(newData, showCols);
    subData.map(function(x) {return fill(x, ncols);});
    table.clear().rows.add(subData);
    
    // Add highlighted rows from cache (for pivot)
    var hlRows = highlightedRows[rowX];
    if(hlRows !== undefined) {
      table.rows().every(function() {
        if(hlRows.includes(this.data()[2])){ this.select(); }
      });
    }
    
    // Get row indexes that include shown years
    var yrIndexes = table.rows().eq(0).filter(function(idx) {
      var yr = table.cell(idx, 0).data();
      return rowYears.includes(yr) ? true: false;
    });
    
    // Edit column names and generate colLevels
    colLevels = {};
    var tabCols = table.columns().header().toJQuery();
    tabCols.each( function(index) {
      if(colNames[index] === undefined) {
        $(this).removeClass("showDT");
      } else {
        $(this).addClass("showDT");
        $(this).text(colNames[index]);
        
        // Generate colLevels
        if($(this).hasClass('coef')) {
          colData = table.cells(yrIndexes, index).data().toArray();
         // colData2 =table.cells(yrIndexes, index).data().toArray().parseFloat();
          //   colData2 = table.cells(yrIndexes, index).data().toArray();
          skip_missing_cols = (appKey == 'hc_use' && colData.every(isNull));
          if(!skip_missing_cols) {
            var colNm = colNames[index];
            var colKey = colClasses[index].split("__")[1];
            colLevels[colKey]  = colNm;
          }
        }
      }
    });
    
    // Change group column name
    var grpName = rowX == 'ind' ? 'Year' : $('#row_var option:selected').text();
    table.columns(2).header().toJQuery().text(grpName);
    
    // For 'use' app, convert header to statistic label if no colgrp selected
    var colgrpName = $('#stat_var option:selected').text();
    if(col_var == 'ind' && !isPivot) {
      table.columns(5).header().toJQuery().text(colgrpName);
      table.columns(6).header().toJQuery().text(colgrpName);
    }
    
    // Select rows by year and generate rowLevels;
    table.columns(0).search(rowYears, true, false);
    rowLevels = {};
    table.rows(yrIndexes).every( function(index) {
      var el = this.data();
      var rowKey = el[3], rowNm = el[2];
      rowLevels[rowKey] = rowNm;
    });
    
    $(document).trigger('updateRowLevels');
    $(document).trigger('updateColLevels');
    
    selectColLevels(table, colLevels, selectedLevels, colX, colNames);
    selectRowLevels(table, rowLevels, selectedLevels, rowX);
    
    $(document).trigger("newHighlighted");
    $(document).trigger("checkControlTotals");
    $(document).trigger('updateNotes');
    
    $('#meps-table').show();
  });
});





// Levels selection -----------------------------------------------------------
  
  // Switch rows and cols (use app only)
$('#switchRC').on('click', function() {
  var currentRow = $('#row_var').val();
  var currentCol = $('#col_var').val();
  $('#col_var').val(currentRow);
  $('#row_var').val(currentCol);
  $(document).trigger('updateValues');
});

// Update levels checkbox groups
$(document).on('updateRowLevels', function() {
  createCheckboxGroup('row', rowLevels, selectedLevels[row_var]);
  if(row_var == 'ind' || rcEqual) {
    $('#rowDrop').slideUp('fast');
  } else {
    $('#rowDrop').slideDown('fast');
  }
});
$(document).on('updateColLevels', function() {
  createCheckboxGroup('col', colLevels, selectedLevels[col_var]);
  if (col_var == 'ind') {
    $('#colDrop').slideUp('fast');
  } else {
    $('#colDrop').slideDown('fast');
  }
});

// Reset checkboxes
$('#rowReset').on('click', function() {
  createCheckboxGroup('row', rowLevels, initLevels[row_var]);
  $(document).trigger("selectRowLevels");
});
$('#colReset').on('click', function() {
  createCheckboxGroup('col', colLevels, initLevels[col_var]);
  $(document).trigger("selectColLevels");
});

// Cache selected levels on click
$('#rowLevels ul').on('click', function() { $(document).trigger("selectRowLevels");});
$('#colLevels ul').on('click', function() { $(document).trigger("selectColLevels");});

// Search rows based on selected levels
$(document).on("selectRowLevels", function() {
  var checkedLevels = checkList('#rowLevels');
  var currentSelected = selectedLevels[row_var];
  var hidden = notIn(currentSelected, rowLevels);
  $.extend(checkedLevels, hidden);
  
  selectedLevels[row_var] = checkedLevels;
  selectRowLevels(table, rowLevels, selectedLevels, rowX);
  if(activeTab == 'table-pill') { $(document).trigger("updateTable");}
  if(activeTab == 'plot-pill')  { $(document).trigger("updatePlot");}
  $(document).trigger('updateNotes');
});

// Show/hide columns based on selected levels
$(document).on("selectColLevels", function() {
  var checkedLevels = checkList('#colLevels');
  var currentSelected = selectedLevels[col_var];
  var hidden = notIn(currentSelected, colLevels);
  $.extend(checkedLevels, hidden);
  
  selectedLevels[col_var] = checkedLevels;
  selectColLevels(table, colLevels, selectedLevels, colX, colNames);
  if(activeTab == 'table-pill') { $(document).trigger("updateTable"); }
  if(activeTab == 'plot-pill')  { $(document).trigger("updatePlot");}
  $(document).trigger('updateNotes');
});

// Prevent unchecking all group levels
$('#rowLevels ul').on("click", "li input", function(e) {
  var n_checked = $('#rowLevels').find('input:checked').length;
  var this_checked = $(this).is(":checked");
  if(!this_checked && n_checked === 0) {
    e.preventDefault();
    return false;
  }
});

$('#colLevels ul').on("click", "li input", function(e) {
  var n_checked = $('#colLevels').find('input:checked').length;
  var this_checked = $(this).is(":checked");
  if(!this_checked && n_checked === 0) {
    e.preventDefault();
    return false;
  }
});


// Row highlighting - Pivot tables only ---------------------------------------
  
  if(isPivot) {
    var nSelected = 0;
    $('#plot-pill').attr('data-toggle','');
    $('#plot-pill').addClass('disabled');
    
    // Highlight selected rows
    $('#meps-table tbody').on('click', 'tr', function () {
      // Limit to 10 selections
      if(nSelected < 10 || $(this).hasClass('selected')) {
        $(this).toggleClass('selected');
      }
      $(document).trigger('newHighlighted');
      if(activeTab == 'plot-pill') { $(document).trigger("updatePlot");}
    });
    
    // Clear selected rows
    $('#deselect').on('click', function() {
      //  table.cells('.selected', 4).every(function(el) {this.data(0);});
      table.rows().deselect();
      $(document).trigger('newHighlighted');
      if(activeTab == 'plot-pill') { $(document).trigger("updatePlot");}
    });
    
    // Update cached selection
    $(document).on('newHighlighted', function() {
      table.cells('', 4).every(function(el) {this.data(0);});
      table.cells('.selected', 4).every(function(el) { this.data(1); });
      highlightedRows[rowX] = table.cells('.selected', 2).data().toArray();
    });
    
    // Sort by selected rows
    $('#sort-selected').on('click', function() {
      order_col = 'selected';
      order_dir = 'desc';
      $(document).trigger("updateTable");
    });
    
    // Disable or enable plot tab based on selected rows
    $(document).on('newHighlighted',function() {
      nSelected = table.rows('.selected').count();
      if(nSelected === 0){
        $('#plot-pill').attr('data-toggle','');
        $('#plot-pill').addClass('disabled');
        $('#select-rows-message').show();
        $('#meps-plot').hide();
      } else {
        $('#plot-pill').attr('data-toggle','tab');
        $('#plot-pill').removeClass('disabled');
        $('#select-rows-message').hide();
        $('#meps-plot').show();
      }
      $(document).trigger("updateNotes"); // for plot footnotes
    });
    
  } // end of ifPivot -- row highlighting


// Show SEs (+check control totals) -------------------------------------------
  var checkedSEs = false, showSEs = false, ctype = '.coef', controlTotals = false;
  $('#showSEs').on('change', function() {
    checkedSEs =  $('#showSEs').is(":checked");
    $(document).trigger("checkControlTotals");
  });
  
  // Update control totals message
  $(document).on('checkControlTotals', function() {
    var ctVars = ['ind', 'agegrps', 'race', 'sex', 'poverty', 'region'];
    
    
    controlTotals = (ctVars.includes(rowX) && ctVars.includes(colX) && (stat_var == 'num_HD'||stat_var == 'num_COR'||stat_var == 'num_HTN'||stat_var == 'num_STK'));
    
    if(checkedSEs && controlTotals) {
      showSEs = false;
      $('#control-totals').slideDown('fast');
    } else {
      showSEs = checkedSEs;
      $('#control-totals').slideUp('fast');
    }
    
    ctype = showSEs ? '.se' : '.coef';
    $(document).trigger("updateNotes");
    if(activeTab == 'table-pill') { $(document).trigger("updateTable");}
    if(activeTab == 'plot-pill')  { $(document).trigger("updatePlot");}
  });
  
  
  // TABLE TAB ------------------------------------------------------------------
    var order_col = undefined, order_dir = 'asc';
    $('#meps-table thead').on('click', 'th', function () {
      order_col = $(this).text();
      order_dir = table.order()[0][1];
    });
    
    // Redraw table
    $(document).on("updateTable", function() {
      // Get ordering column if applicable
      if(isPivot) {
        var order_index = table.columns().header().toJQuery().map(function(el) {
          if($(this).text() == order_col) { return(el); }
        })[0];
        
        if(order_index === undefined) {
          order_index = 2; // row category
          order_dir = 'asc';
        }
        table.order([order_index, order_dir]);
      }
      
      table
      .columns().visible(false)
      .columns('.main, .showDT'+ctype).visible(true)
      .draw();
        //var seCols2   = table.columns('.main, .showDT.se', {search : 'applied'}).data().toArray();
        //var SE_test2  =  array_column_conditional(seCols2, 1, 0);
        var SE_test2b  =  table.columns('.main, .showDT.se', {search : 'applied'}).data().toArray();
        var SE_test22 = SE_test2b.splice(0, 2);
        //   comma_ses = se_comma(SE_test2b);
       // var stringse = SE_test2b.replaceAll(',', '+');
       // var SE_test3 = SE_test2b.remove(1);
      
    });

       //  var seCols2   = table.columns('.main, .showDT.se', {search : 'applied'}).data().toArray();
        //var SE_test2  =  array_column_conditional(seCols2, 0, 0);
       // var SE_test3  =  array_column_conditional(SE_test2, 0, 0);
    
    // Export table to csv --------------------------
      $('#dl-table').on('click', function() {
        var coefCols = table.columns('.main, .showDT.coef', {search : 'applied'}).data().toArray();
        var seCols   = table.columns('.main, .showDT.se', {search : 'applied'}).data().toArray();
       // var SE_test  =  array_column_conditional(seCols, 0, 0);
    
        
        var coefRows = transpose(coefCols).map(function(el) { return el.map(formatNum);});
        var seRows   = transpose(seCols).map(function(el) { return el.map(formatNum);});
        
        var headers = table.columns('.main, .showDT.coef').header().toJQuery();
        var cNames  = headers.map(function() {return $(this).text();}).toArray();
        
        var coefCSV = convertArrayOfObjectsToCSV({data: coefRows, colnames: cNames});
        var seCSV   = convertArrayOfObjectsToCSV({data: seRows, colnames: cNames});
        
        var seCaption = "Standard errors for " +
          fullCaption.charAt(0).toLowerCase() + fullCaption.slice(1);
        
        if(controlTotals) {
          seCaption = $('#control-totals').text();
          seCSV = "";
        }
        
        var dlSource = newSource.replace('<b>','').replace('</b>','');
        
        var csv = $.grep(
          ['"'+fullCaption.replace(" (standard errors)","")+'"', coefCSV,
           '"'+seCaption.replace(" (standard errors)","") +'"', seCSV,
           $('#suppress').text(),
           $('#RSE').text(),
           '"'+dlSource+'"'], Boolean).join("\n");
        
        downloadFile({file: csv, filename: 'NCHS-table-' + shortDate() + '.csv'});
      });
      
  
      
 // Array of Index SE selection -----------------------------------------------------------

    // PLOT TAB -------------------------------------------------------------------
      var plotFootnotes;
    
    var config = {
      fillframe: true,
      displayModeBar: false,
      displaylogo: false,
      modeBarButtonsToRemove: ['toImage','sendDataToCloud', 'zoom2d', 'pan2d',
                               'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d',
                               'resetScale2d', 'hoverClosestCartesian', 'hoverCompareCartesian',
                               'hoverClosest3d', 'toggleSpikelines']
    };
    
    var meps_source = {
      xref: 'paper', x: 0, xanchor: 'left',
      yref: 'paper', y: -0.16, yanchor: 'bottom',
      showarrow: false, font: {size: 12}, align: 'left',
      text: 'MEPS' , visible: true
    };
    
    var legend_title = {
      xref: 'paper', x: 1.02, xanchor: 'left',
      yref: 'paper', y: 1, yanchor: 'top',
      showarrow: false, font: {size: 12}, align: 'left',
      text: 'Legend title'
    };
    
    // Change plot height depending on needed height for legend
    var layout = {
      width: 700, height: 600, autosize: true, hovermode: 'closest',
      font: {family: "Arial", size: 12},
      margin: {l: 100, r: 50, b: 110, t: 100},
      legend: {y: 0.92, tracegroupgap: 5, traceorder: 'grouped'}
    };
    
    $(document).on('updatePlot', function() {
      var headers = table.columns('.showDT.coef').header().toJQuery();
      var x, y, y_se, y_se2, y_names, labelRows, hideLegend, hideYaxis, plotTraces, se_cols2;
      //      var x, y, y_se, y_names, labelRows, hideLegend, hideYaxis, plotTraces, hovertemplate;
      
      if(isPivot) {
        // if pivot, use selected rows only and transpose data
        var coef_cols = table.columns('.showDT.coef', {order: 'index'}).data().toArray();
        var se_cols   = table.columns('.showDT.se',   {order: 'index'}).data().toArray();
         selectedIndexes  = table.rows('.selected').indexes();
        
        x  = headers.map(function() {return $(this).text();}).toArray();
        y  = selectRows(transpose(coef_cols), selectedIndexes);
        y_se = selectRows(transpose(se_cols), selectedIndexes);
        y_se2 = y_se;
        y_names = table.cells('.selected', 2).data().toArray();
        
        

      } else {
        x  = table.columns(2, {search : 'applied'}).data().toArray()[0];
        y  = table.columns('.showDT.coef', {search : 'applied'}).data().toArray();
        y_se = table.columns('.showDT.se', {search : 'applied'}).data().toArray();
         y_se2 = y_se;
        y_names  = headers.map(function() {return $(this).text();}).toArray();
        
        
               if(y_se2 === null) {
       return y_se2;
     //if(!isNaN(y_se)) return y_se*1;
  
         //var newstr2test = y_se2.replaceAll(",","+");
         var newstr2test = y_se2.replace(',', '');

              var lcl_ses2test = newstr2test.split("+").slice(0,1);
              var ucl_ses2test = newstr2test.split("+").slice(-1);
     return ucl_ses2test*1;
    
    
    for (var i = 0; i < y_se2.length; i++) {
 testarray2=testarray[i].replaceAll(',', '+');
  console.log(testarray2);
}
   }
      }
      
      x = x.map(editLabel);
      y_names = y_names.map(editLabel);
      
      var cTitle = colX == "ind" ? "" : $('#col_var option:selected').text().toLowerCase();
      var rTitle = rowX == "ind" ? "" : $('#row_var option:selected').text().toLowerCase();
      
      var legendText = isPivot ? cTitle : rTitle;
      var legendTitle = camelCase(wrap(legendText, 20));
     // var hoverfmt = stat_var.slice(0,3) == 'pct' ? '0,.1f' : '0,.1f';
      var hoverfmt = '.2f';
      //var hovertemplate= 'hovertemplate';
      
      if(isTrend) {
        x_names = x; // set x_names to quarterly strings (in tickvals later) 
        if(is_quarterly) { 
          x = x_names.map(qtr_to_num) // convert to numeric for plotly x values 
        } 
        plotTraces = linePlotData(
          x_values = x,
          y_values = y,
          y_ses = y_se,
          // hovertemplate= "hovertemplate",
          y_labels = y_names,
          showSEs = showSEs);

          var y_line = y_values.slice(-1).toString().split(',').map(Number);

          var lcl_y_line = y_ses.slice(0, 1).toString().split(',').map(Number);
          var ucl_y_line = y_ses.slice(-1).toString().split(',').map(Number);
          var y_min = Math.min.apply(null, lcl_y_line) - 5;
          var y_max = Math.max.apply(null, ucl_y_line) + 5;
          //var y_max22 = Math.max.apply(null, y_line) + 5;
          var y_max22 = Math.max.apply(...[y_line]) + 5;
          var y_max2 = y_max22 || 100;        
       // hovertemplate= "hovertemplate";
        labelRows = countBreaks(y_labels);
        hideLegend = (rowX == 'ind' && colX == 'ind');
        hideYaxis = false;
        //layout.yaxis = {tickformat: '0,.5',   title: 'Percent'};
          layout.yaxis = { tickformat: '0,.5', hoverformat: hoverfmt, range: [0, y_max22], title: 'Percent'};
        layout.margin.l = 60;
        //layout.xaxis = x.length < 5 ? {tickvals: x_values,  title: 'Year'} : {};
        layout.xaxis = x.length < 15 ? {tickvals: x_values, ticktext: x_names, title: 'Year'} : {};
//        [ '2017Q1', '2017Q2', '2017Q3', '2017Q4',
//          '2018Q1', '2018Q2', '2018Q3', '2018Q4'],  title: 'Year'} : {};
        
      } else {
        plotTraces = barPlotData(
          x_values = y_names,
          y_values = transpose(y),
          y_ses = transpose(y_se),
          y_labels = x,
          //hovertemplate= "hovertemplate",
          showSEs = showSEs);



          var lcl_y_bar = y_ses.slice(0, 1).toString().split(',').map(Number);
          var ucl_y_bar = y_ses.slice(-1).toString().split(',').map(Number);

          var x_min = Math.min.apply(null, ucl_y_bar.filter(function (n) { return !isNaN(n); }));
          var x_max = Math.max.apply(null, ucl_y_bar.filter(function (n) { return !isNaN(n); })) + 10;

          //var x_min = Math.min.apply(null, lcl_y_bar) - 5;
          //var x_max = Math.max.apply(null, ucl_y_bar) + 5,





        //hovertemplate= "hovertemplate";
        labelRows = Math.max(countBreaks(y_labels), countBreaks(x_values));
        hideLegend = isPivot ? (colX == 'ind') : (rowX == 'ind');
        hideYaxis  = isPivot ? (rowX == 'ind') : (colX == 'ind');
        // layout.xaxis = {showline: false, zeroline: false,  tickformat: '0,.5'};
         // layout.xaxis = { showline: false, zeroline: false, hoverformat: hoverfmt, tickformat: '0,.5' };
          layout.xaxis = { showline: false, zeroline: false, range: [0, x_max], hoverformat: hoverfmt, tickformat: '0,.5', title: 'Percent' };
        layout.yaxis = {autorange: 'reversed', //visible: !hideYaxis,
          showline: false, zeroline: false, showticklabels: false};
        layout.margin.l = hideYaxis? 20 : 140;
      }
      
      layout.xaxis.fixedrange = true;
      layout.yaxis.fixedrange = true;
      
      if(plotTraces === null) {
        $('.plot-dependent').hide();
        $('#plot-warning').show();
        
      } else {
        var plotData = plotTraces.data;
        var ylabels  = hideYaxis ? null : plotTraces.ylabels;
        
        var extraHeight = Math.max(0, (labelRows-16)*30);
        layout.height = 600 + extraHeight;
        
        //layout.title =  wrap70(plotCaption);
        layout.showlegend = !hideLegend;
        layout.annotations = [meps_source, legend_title].concat(ylabels);
        //layout.annotations[0].visible = false;
        
        // Need to remove <b> tags for IE to work, for some reason
        var pltSource = newSource.replaceAll('<b>','').replaceAll('</b>','');
        var pltFoot = plotSuppress ? $('#plot-suppress').text()+"<br>" : "";
        

        
        plotFootnotes = pltFoot + wrap(pltSource, 100);
        
        layout.annotations[0].text = plotFootnotes;
        layout.annotations[0].visible = false;
        layout.annotations[1].text = legendTitle;
        
        $('.plot-dependent').show();
        $('#plot-warning').hide();
        Plotly.newPlot('meps-plot', plotData, layout, config);
      }
    });
    
    // Export plot to png ---------------------------
      
      $('#dl-plot').on('click', function() {
        var fName = 'NCHS-plot-' + shortDate();
        layout.annotations[0].visible = true;
        downloadPlot({filename: fName, footnotes: plotFootnotes, height: layout.height});
        layout.annotations[0].visible = false;
      });
    
    

    // Export code to text files --------------------
      $('#dl-code').on('click', function() {
        var fName = 'meps-code-' + shortDate() + '.'+lang;
        downloadFile({file: codeText, filename: fName});
      });
    
    
    // Caption, Citation, Notes ---------------------------------------------------
      var fullCaption, fullCaption2, fullCaption3, plotCaption, newSource, statName2;
    var plotSuppress = false;
    
    // Footnotes
    $(document).on('updateNotes', function() {
      
      if(isPivot) {
        var cellData = table.cells('.selected','.showDT.coef').data().toArray();
      } else {
        var cellData = table.cells({search: 'applied'},'.showDT.coef').data().toArray();
      }
      
      plotSuppress = false; /* Reset to false */
        for(var i = 0; i < cellData.length; i++) {
          var el_i = cellData[i];
          plotSuppress = (el_i===null || el_i=="NA") ? true : plotSuppress;
          if(plotSuppress) {break;}
        }
      plotSuppress ? $('#plot-suppress').show() : $('#plot-suppress').hide();
    });
    
      $(document).on('updateNotes', function () {
          var yearName = isTrend ? [year, yearStart].filter(unique).sort().join("\u2014") : year;
          //var yearName = isTrend ? [year, yearStart].filter(unique).sort().join("-") : year;

          fullCaption = newCaption + ", " + yearName;
          yearName_table = yearName;
          $('#yearName-table ').text(yearName_table);
          yearName_plot = yearName;
          $('#yearName-plot ').text(yearName_plot);


          var tableCaption = showSEs ? fullCaption :
              fullCaption.replace(" (95% confidence intervals)", "");
          $('#table-caption').text(tableCaption);


          tableCaption2 = newCaption2;
          $('#table-caption2').text(tableCaption2);


          tableCaption3 = newCaption3;
          $('#table-caption3').text(tableCaption3);
          plotCaption3 = newCaption3;
          $('#plot-caption3').text(tableCaption3);

          plotCaption = tableCaption.replace(" (95% confidence intervals)", " (95% confidence intervals)");
          $('#plot-caption').text(plotCaption);

          //       plotCaption2 = tableCaption2.replace(" (standard errors)"," (95% confidence intervals)");
          //       $('#plot-caption2').text(plotCaption2);

          // Citation
          // var uri = "<b>Source:</b>";
          // var enc = encodeURI(uri);
          // var dec = decodeURI(enc);
          // var SOURCE = dec ;
          var NCHS = "National Center for Health Statistics";
          var NHIS = "National Health Interview Survey";
          var SHS = "Summary Health Statistics";
          //var yearName2 = yearName;
          //var plotyearName2 = yearName;

          //var SOURCE_raw = "Source";
          //var SOURCE= SOURCE_raw.bold();


          var today = new Date();
//          var newCitation = NCHS + ". " + tableCaption + ". " + NHIS +
//              ". Generated interactively: " + today.toDateString() + ".";


          var today3 = new Date().toDateString().slice(4);

          newSource = "<b>Source:</b> " + NCHS + ", " + NHIS;
        //newSource = NCHS+", "+NHIS+", "+yearName;
          //      newSource = "<b>Source:</b> "+SHS+", "+NCHS+", "+NHIS+", "+yearName;

          var statNote = mepsNotes[stat_var];
          var statName2= statName;
          // Difficulty and reasons for difficulty don't need statement on 'percents may not add to 100'
          if (appKey == 'hc_care' && (colX.includes('rsn') || colX == "difficulty")) {
              statNote = "";
          }

          var newNotes = $.grep([
              statNote,
              mepsNotes[rowX],
              mepsNotes[colX]], Boolean).join("\n");

          var newNotes2 = newNotes;

      var qnewNotes = $.grep([
      statNote,
      qmepsNotes[rowX],
          qmepsNotes[statName2]], Boolean).join("\n");

          //USE THIS FOR NEW TITLE
          qnewtitle = qtitle[statName2] + yearName;
          qnewtitle2 = qnewtitle;
          //this is new part
          var titleCaption = showSEs ? qnewtitle :
              qnewtitle.replace(" (95% confidence intervals)", "");
          $('#table-title').text(titleCaption);

          var plotCaption = showSEs ? qnewtitle :
              qnewtitle.replace(" (95% confidence intervals)", "");
          $('#plot-title').text(plotCaption);


          var newCitation = NCHS + ". " + titleCaption + ". " + NHIS +
              ". Generated interactively: " + today3 + " from https://wwwn.cdc.gov/NHISDataQueryTool/SHS_child/index.html";


          qnewNotes2 = qnewNotes;
          $('#plot-qnotes').html(qnewNotes2);
          $('#source').html(newSource);
          $('#plotsource').html(newSource);
          $('#notes').html(newNotes);
          $('#plotnotes').html(newNotes2);
      //  $('#trendnotes').html(qtrendNotes);
      //  $('#plot-trendnotes').html(qtrendNotes);
          $('#qnotes').html(qnewNotes);
          $('#citation').text(newCitation);
          $('#plotcitation').text(newCitation);
          $('#plot-title').html(plotCaption);
        //  $('#plot-title').html(qnewtitle2);
          $('#table-title').html(titleCaption);
      });


      // Trigger --------------------------------------------------------------------
      // trigger on load too -- must be at end;
      $('#stat_var, #code-language, #data-view, #col_var, #row_var, #year, #showSEs').trigger('change');
  });
