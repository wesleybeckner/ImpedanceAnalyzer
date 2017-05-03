/* Adds a button (using button.js) to the main Nyquist plot*/
function addP2dexploreButton() {
    let svg = d3.select("#nyquist svg")

    let width = d3.select('#nyquist').node().getBoundingClientRect().width;
    let height = d3.select('#nyquist').node().getBoundingClientRect().height;

    let g = svg.append('g')
        .attr('class', 'button')
        .attr('transform', 'translate(' + width*.7 + ',' + height*.1 + ')')

    let text = g.append('text')
        .text('Explore P2D Fit')

    button()
        .container(g)
        .text(text)
        .count(0)
        .cb(function() { $('#exploreFitModal').modal('show') })();
}

var color_list = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b'];
var color_count = 0;

/* Creates the residual plot, nyquist plot, and parameter table within the
 modal for exploring the results.

 @param {Array.<Object>} full_results An array containing impedance objects

 */
function populateModal(full_results, names, data, fit_data) {

    let outerWidth = $(window).width()*0.98/3;
    let outerHeight = $(window).height()*0.7;

    let size = d3.min([outerWidth, outerHeight]);

    let svg_res = d3.select('#explore-residuals').append("svg")

    let margin = {top: 10, right: 10, bottom: 60, left: 60};
    let width = size - margin.left - margin.right;
    let height = size - margin.top - margin.bottom;

    let xScale_res = d3.scale.linear()
    let yScale_res = d3.scale.linear()

    let xAxis_res = d3.svg.axis()
        .scale(xScale_res)
        .ticks(5)
        .orient('bottom');

    let yAxis_res = d3.svg.axis()
        .scale(yScale_res)
        .ticks(5)
        .orient('left');

    xScale_res
        .range([0, width])
        .domain(d3.extent(full_results, (d, i) => i ));

    yScale_res
        .range([height, 0])
        .domain(d3.extent(full_results, (d, i) => d.residual ));


    // Update the outer dimensions.
    svg_res
        .attr("width", outerWidth)
        .attr("height", outerHeight);

    let plot_res = svg_res.append("g");

    plot_res.append("g")
        .attr("class", "x axis")
        .attr("width", width)
        .attr("height", height);

    plot_res.append("g")
        .attr("class", "y axis")
        .attr("width", width)
        .attr("height", height);

    let g_res = svg_res.select("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    g_res.select(".x.axis")
        .attr('transform', 'translate(0,' + height + margin.bottom + ')')
        .call(xAxis_res)

    g_res.select(".y.axis")
        .attr('transform', 'translate(0,' + 0 + ')')
        .call(yAxis_res)

    g_res.append("text")
        .attr("class", "label")
        .attr("transform", "translate(" + (width/2) + " ," +
                                        (height + margin.bottom - 10) + ")")
        .style("text-anchor", "middle")
        .text("Number #");

    g_res.append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left - 0)
        .attr("x",0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Avg. % Error");

    let div = d3.select("#explore-residuals").append("div")
        .attr("class", "explore-tooltip")
        .style("opacity", 0);

    let residuals = g_res.selectAll("circle").data(full_results);

    var selected = []

    residuals.enter().append('circle');
    residuals
        .attr("cx", (d, i) => xScale_res(i))
        .attr("cy", (d) => yScale_res(d.residual))
        .attr("r", 5)
        .attr("fill", (d) => get_accu_color(d, full_results))
        .on("mouseover", function(d, i) {

            impedance = full_results.find((data) => data['run'] == d.run);

            let area = d.area;
            let contact_resistance = d.contact_resistance;

            let ohmicResistance = calcHFAccuracy(impedance);

            // get names/values of parameters
            parameters = parameter_names_units(impedance);

            // add values for currently moused over run
            impedance['parameters'].forEach((d,i) => {
                var run = impedance['run']
                parameters[i].set(run.toString(), d['value']);
            });

            // add values for selected runs
            selected.forEach(function(selected_run, run) {
                var run = selected_run['run']
                parameters.forEach(function(param, i) {
                    parameters[i].set(run.toString(), selected_run['parameters'][i].value);
                })
            })

            // update parameter table
            updateParameterTable(parameters, selected);

            // plot the impedance as a line
            plot_impedance(impedance, area, contact_resistance, fit_data)

            if (d3.select(this).attr('class') != 'selected-circle') {
                d3.select(this).attr("r", 7);
            }

            let {positive, negative} = calcCapacity(impedance, area)

            div.html(
                'Rank: ' + (i+1) + '<br>' +
                'MSE:  ' + d.residual.toPrecision(2)  + '%'  + '<br>' +
                'Run: '+ d.run + '<br>' +
                'Pos Capacity: ' + positive.toPrecision(4) + 'mAh' + '<br>' +
                'Neg Capacity: ' + negative.toPrecision(4) + 'mAh' + '<br>' +
                'HF Intercept: ' + (1000*calcOhmicR(impedance)/area).toPrecision(3) + ' mOhms' + '<br>' +
                'Contact Resistance: ' + (1000*contact_resistance/area).toPrecision(3) + ' mOhms')
                .style("left", 0.6*width + "px")
                .style("top", 0.6*height + "px");

        })
        .on("mouseout", function(d) {
            if (d3.select(this).attr('class') != 'selected-circle') {
                d3.select(this).attr("r", 5)
            }
            window.nyquistExplore.clear('.error_lines');
            window.nyquistExplore.clear('.explore-nyquist-path');

            // get names/values of parameters
            var parameters = parameter_names_units(impedance);

            // add values for selected runs
            selected.forEach(function(selected_run, run) {
                var run = selected_run['run']
                parameters.forEach(function(param, i) {
                    parameters[i].set(run.toString(), selected_run['parameters'][i].value);
                })
            })

            // update parameter table
            updateParameterTable(parameters, selected);

        })
        .on("click", function(d, i) {


            if (d3.select(this).attr('class') != 'selected-circle') {
                d3.select(this).attr("class", "selected-circle")
                d3.select(this).attr("id", "run-" + d.run)
                d3.select(this)
                    .attr("r", 7)
                    .style('stroke-width', 3)
                    .style('stroke', color_list[color_count % 6]);

                impedance = full_results.find((data) => data['run'] == d.run);

                let area = impedance.area;
                let contact_resistance = impedance.contact_resistance;
                scaled = []

                impedance['freq'].forEach(function(d,i) {
                    scaled.push([impedance['freq'][i],
                                 (impedance['real'][i] + contact_resistance)/area,
                                 impedance['imag'][i]/area]);
                });

                var selected_parameters = []

                impedance['parameters'].forEach(function(d,i) {
                    selected_parameters[i] = {
                        value: d['value']
                    }
                })

                selected.push({ id:  "run-" + d.run, run: d.run, rank: i + 1, data: scaled, color: color_list[color_count % 6], parameters: selected_parameters});

                color_count += 1;

            } else {
                d3.select(this).classed("selected-circle", false)
                d3.select(this)
                    .attr("r", 5)
                    .style('stroke-width', 0)

                var selected_id = d3.select(this).attr('id')

                selected = $.grep(selected, function(d) { return d.id == selected_id}, true);

            }

            window.nyquistExplore.clear(".explore-nyquist-selected")

            selected.forEach(function(d,i) {
                window.nyquistExplore.addModel(d.data, "explore-nyquist-selected", d.id, d.color)
            });

            // get names/values of parameters
            var parameters = parameter_names_units(impedance);

            // add values for selected runs
            selected.forEach(function(selected_run, run) {
                var run = selected_run['run']
                parameters.forEach(function(param, i) {
                    parameters[i].set(run.toString(), selected_run['parameters'][i].value);
                })
            })

            // update parameter table
            updateParameterTable(parameters, selected);

            d3.select("#explore-nyquist svg").selectAll("text#legend").remove();

            var legend = d3.select("#explore-nyquist svg").selectAll("text#legend")
                            .data(selected);

            legend.enter().append('text');

            legend
                .attr("id", "legend")
                .attr('r', 5)
                .attr('x', margin.left + 40)
                .attr('y', function(d,i) {return 40 + 20*(i+1) + "px";})
                .text(function(d) {return "Rank: " + d.rank + "   Run: " + d.id.split('-')[1];})
                .style('fill', function(d) { return d.color} )
                .on("click", function(d, i) {
                    d3.selectAll("circle#" + d.id).each(function(d, i) {
                        var onClickFunc = d3.select(this).on("click");
                        onClickFunc.apply(this, [d, i]);
                    });
                });

        });

        let legend_text = [{name: 'Good, Pos. Contact Res.', color: '#0571b0'},
                           {name: 'Suspect, Pos. Contact Res.', color: '#ca0020'}]//,
                        //    {name: 'Good, Neg. Contact Res.', color: '#92c5de'},
                        //    {name: 'Suspect, Neg. Contact Res.', color: '#f4a582'}]

        let residual_legend = d3.select("#explore-residuals svg")
                                .selectAll("text#legend")
                                    .data(legend_text);

        residual_legend.enter().append('text');

        residual_legend
            .attr("id", "legend")
            .attr('x', margin.left + 5)
            .attr('y', (d,i) => 5 + 20*(i+1) + "px")
            .text((d) => d.name)
            .style('fill', (d) => d.color)


    nyquist_config = {
        outerWidth: outerWidth,
        outerHeight: outerHeight,
        element: document.querySelector('#explore-nyquist'),
        data: data
    }

    window.nyquistExplore = new Nyquist(nyquist_config);

    if (fit_data) {
        window.nyquistExplore.addPoints(fit_data, "fit_points");
    }

}

function get_accu_color(d, full_results) {
    impedance = full_results.find((data) => data['run'] == d.run);
    let contact_resistance = d.contact_resistance;

    accuracy = calcHFAccuracy(impedance);

    if(accuracy < 0.15) {
        if (contact_resistance > 0) {
            return "#0571b0" // dark blue
        } else {
            return "#92c5de" // light blue
        }
    } else {
        if (contact_resistance > 0) {
            return "#ca0020" // dark red
        } else {
            return "#f4a582" // light red
        }
    }
}

function parameter_names_units(impedance) {
    var names = ["fit[cm^2]", "run[]", "l_{neg}[m]", "l_{sep}[m]", "l_{pos}[m]", "R_{p,neg}[m]", "R_{p,pos}[m]", "\\epsilon_{f,neg}[1]", "\\epsilon_{f,pos}[1]", "\\epsilon_{neg}[1]", "\\epsilon_{sep}[1]", "\\epsilon_{pos}[1]", "C_{dl,neg}[{\\mu}F/cm^2]", "C_{dl,pos}[{\\mu}F/cm^2]", "c_0[mol/m^3]", "D[m^2/s]", "D_{s,neg}[m^2/s]", "D_{s,pos}[m^2/s]", "i_{0,neg}[A/m^2]", "i_{0,pos}[A/m^2]", "t_+^0[1]", "\\alpha_{a,neg}[1]", "\\alpha_{a,pos}[1]", "\\kappa_0[S/m]", "\\sigma_{neg}[S/m]", "\\sigma_{pos}[S/m]", "{\\frac{dU}{dc_p}\\bigg|_{neg}}[V*cm^3/mol]", "{\\frac{dU}{dc_p}\\bigg|_{pos}}[V*cm^3/mol]"];

    parameters = []

    names.forEach(function(d,i) {
        var p = new Map();

        p.set('name', "\\[" + d.split("[")[0] + "\\]")
        p.set('units', "\\[" + d.split("[")[d.split("[").length-1].replace("]","") + "\\]")

        parameters[i] = p
    })
    return parameters
}

function updateParameterTable(parameters, selected) {

    var columns = Array.from(parameters[0].keys());

    var num_cols = columns.length;
    var col_range = Array.from({length: num_cols}, (v, k) => k+1);

    d3.select("#parameter-estimates tbody .table-header").selectAll('th').remove()

    d3.select("#parameter-estimates tbody .table-header").selectAll('th')
        .data(columns)
        .enter()
        .append("th")
        .html((d) => d);

    d3.select("#parameter-estimates tbody").selectAll(".dataRow")
        .data(parameters)
        .enter()
        .append("tr")
        .attr("class", "dataRow");

    d3.select("#parameter-estimates tbody").selectAll(".dataRow")
        .data(parameters)
        .attr("class", "dataRow");

    d3.selectAll("#parameter-estimates tbody .dataRow")
        .selectAll("td").remove()

    d3.selectAll("#parameter-estimates tbody .dataRow")
        .selectAll("td")
        .data(col_range)
        .enter()
        .append("td")

    d3.selectAll("#parameter-estimates tbody .dataRow")
        .selectAll("td")
        .data(
            function(row) {
                return columns.map(function(d) {
                    return {value: row.get(d)};
            })
        })
        .html(function(d) { return d.value; });

    $('#parameter-estimates tbody td').each(function(i,d) { renderMathInElement(d); })

    let selected_cols = d3.select("#parameter-estimates tbody .table-header").selectAll('th').filter(function(d) {return parseInt(d)})[0]

    selected_cols.forEach(function(d,i) {
        let run = parseInt(d.textContent);
        let selected_run = selected.filter(function(d) {
            return d.run == run
        })[0];
        if(selected_run) {
            $('#exploreFitModal table#parameter-estimates tr td:nth-child(' + (i+3) + ')').css('color', selected_run.color);
        }
    })
};

function plot_impedance(data, area, contact_resistance, fit_data) {

    let impedance = [];

    data['freq'].forEach(function(d,i) {
        impedance[i] = {
            f: +d,
            real: +data['real'][i] + contact_resistance,
            imag: -1*(+data['imag'][i])
        }
    })

    window.nyquistExplore.updateModel(impedance, area, "explore-nyquist-path")

    window.nyquistExplore.clear('.error_lines');

    var length = 0;

    impedance.forEach(function(d,i) {
        var bisector = [{real: d.real/area, imag: d.imag/area}, {real: fit_data[i][1], imag: -1*fit_data[i][2]}];
        length += Math.sqrt(Math.pow(d.real/area - fit_data[i][1], 2) + Math.pow(d.imag/area + fit_data[i][2], 2))
        window.nyquistExplore.addLines(bisector, "error_lines")
    });
}

function createParameterTable(element, parameters) {

    d3.select(element).select("#parameter-estimates tbody").selectAll(".dataRow")
        .data(parameters)
        .enter()
        .append("tr")
        .attr("class", "dataRow")

    d3.select("#parameter-estimates tbody").selectAll(".dataRow")
        .data(parameters)
        .attr("class", "dataRow")
        // .classed("info", function(d, i) {
        //     return last_p[i].value != parameters[i].value;
        // })

    d3.selectAll("#parameter-estimates tbody .dataRow")
       .selectAll("td")
       .data([0,1,2])
       .enter()
       .append("td")

   d3.selectAll("#parameter-estimates tbody .dataRow")
      .selectAll("td")
      .data(
          function(row) {
          return ["name", "units", "value"].map(function(d) {
              return {value: row[d]};
          });
      })
      .html(function(d) { return d.value; });
}

function calcOhmicR(impedance) {
    parameters = impedance['parameters']

    l_neg = parameters.find(function(d) { return d.name == "l_neg[m]";}).value
    l_sep = parameters.find(function(d) { return d.name == "l_sep[m]";}).value
    l_pos = parameters.find(function(d) { return d.name == "l_pos[m]";}).value

    epsilon_neg = parameters.find((d) => d.name == "epsilon_neg[1]").value
    epsilon_sep = parameters.find((d) => d.name == "epsilon_sep[1]").value
    epsilon_pos = parameters.find((d) => d.name == "epsilon_pos[1]").value

    epsilon_f_neg = parameters.find((d) => d.name == "epsilon_f_neg[1]").value
    epsilon_f_pos = parameters.find((d) => d.name == "epsilon_f_pos[1]").value

    sigma_neg = parameters.find((d) => d.name == "sigma_neg[S/m]").value
    sigma_pos = parameters.find((d) => d.name == "sigma_pos[S/m]").value

    kappa = parameters.find((d) => d.name == "kappa_0[S/m]").value

    r_sep = l_sep/(kappa*Math.pow(epsilon_sep,4))

    r_pos = l_pos/(kappa*Math.pow(epsilon_pos,4) +      sigma_pos*Math.pow(1-epsilon_pos-epsilon_f_pos, 4))

    r_neg = l_neg/(kappa*Math.pow(epsilon_neg,4) +      sigma_neg*Math.pow(1-epsilon_neg-epsilon_f_neg, 4))

    return r_sep + r_pos + r_neg
}

function calcHFAccuracy(impedance) {

    predicted = calcOhmicR(impedance)

    hf_sim = impedance.real[0]

    return (hf_sim - predicted)/predicted;
}

function calcCapacity(impedance, area) {
    parameters = impedance['parameters']

    l_neg = parameters.find((d) => d.name == "l_neg[m]").value
    l_pos = parameters.find((d) => d.name == "l_pos[m]").value

    epsilon_neg = parameters.find((d) => d.name == "epsilon_neg[1]").value
    epsilon_pos = parameters.find((d) => d.name == "epsilon_pos[1]").value

    epsilon_f_neg = parameters.find((d) => d.name == "epsilon_f_neg[1]").value
    epsilon_f_pos = parameters.find((d) => d.name == "epsilon_f_pos[1]").value

    const volEnerCap_pos = 550*10**6; // mAh/cm^3
    const volEnerCap_neg = 400*10**6; // mAh/cm^3

    posCapacity = area*l_pos*volEnerCap_pos*(1-epsilon_pos-epsilon_f_pos)
    negCapacity = area*l_neg*volEnerCap_neg*(1-epsilon_neg-epsilon_f_neg)

    return {positive: posCapacity, negative: negCapacity}

}
