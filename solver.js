'use strict';

function map_get_or_set(map, key, default_value) {
	if (map.has(key)) return map.get(key);
	map.set(key, default_value);
	return default_value;
}

function CalculatorButton(text, type, exec_fn) {
	this.text = text;
	this.type = type;
	this.exec = exec_fn;
}

function Graph(start_node) {
	this.node_list = [];
	this.node_map = new Map();
	this.nodes_by_moves = new Map();
	this.start_node = start_node;
	this.add_node(start_node);
}

Graph.prototype.get_node = function(value) {
	// Returns undefined if node is not in the Map.
	return this.node_map.get(value);
}

Graph.prototype.add_node = function(node) {
	if (this.node_map.has(node.value)) {
		throw 'Node is already in the graph.';
	}
	this.node_list.push(node);
	this.node_map.set(node.value, node);
	map_get_or_set(this.nodes_by_moves, node.moves_left, []).push(node);
}

function Node(value, moves_left) {
	this.value = value;
	this.moves_left = moves_left;
	this.edges = [];
	this.is_goal = false;
}

function Edge(dest, label, is_forward) {
	this.dest = dest;
	this.label = label;
	this.is_forward = is_forward;
}

function sorted(array, sort_key_fn) {
	return array.concat().sort(function(a, b) {
		var _a = sort_key_fn(a);
		var _b = sort_key_fn(b);
		if (_a < _b) return -1;
		if (_a > _b) return  1;
		return 0;
	});
}


function parse_single_operation(str) {
	var patterns = [
		{
			're': /^([-+])\s*([0-9]+)$/,
			'name': 'addsub',
			'parse': function(match, signal, number) {
				var x = parseInt(signal + '' + number, 10);
				return function(value) { return value + x; };
			},
		},
		{
			're': /^([xX*\/])\s*([-+]?)\s*([0-9]+)$/,
			'name': 'muldiv',
			'parse': function(match, op, signal, number) {
				var x = parseInt(signal + '' + number, 10);
				if (/[xX*]/.test(op)) {
					return function(value) { return value * x; };
				} else if (/[\/]/.test(op)) {
					return function(value) { return value / x; };
				} else {
					throw 'Unrecognized "op". This should never happen.';
				}
			},
		},
		{
			're': /^([0-9]+)$/,
			'name': 'append',
			'parse': function(match, digits) {
				return function(value) { return parseInt(value + '' + digits, 10); };
			},
		},
		{
			're': /^(<<?)$/,
			'name': 'backspace',
			'parse': function(match, backspace) {
				// This works for both positive and negative numbers because:
				//  -97 % 10 = -7
				//  -97 - (-7) = -90
				return function(value) { return (value - (value % 10)) / 10; };
			},
		},
		{
			're': /^([0-9]+)\s*=>\s*([0-9]+)$/,
			'name': 'replace',
			'parse': function(match, from, to) {
				var re = new RegExp(from, 'g');
				return function(value) { return parseInt((value + '').replace(re, to), 10); };
			},
		},
		{
			're': /^x?\s*(\^|\*\*)\s*([0-9])$/,
			'name': 'power',
			'parse': function(match, operator, exp) {
				var x = parseInt(exp, 10);
				return function(value) { return Math.pow(value, x); };
			},
		},
		{
			're': /^x?\s*([²³⁴⁵⁶⁷⁸⁹])$/,
			'name': 'power',
			'parse': function(match, exp) {
				var x = {
					'²': 2,
					'³': 3,
					'⁴': 4,
					'⁵': 5,
					'⁶': 6,
					'⁷': 7,
					'⁸': 8,
					'⁹': 9,
				}[exp];
				return function(value) { return Math.pow(value, x); };
			},
		},
		{
			're': /^(\+\s*\/?\s*-|-\s*\/?\s*\+|±|∓)$/,
			'name': 'signal',
			'parse': function(match) {
				return function(value) { return -value; };
			},
		},
		{
			're': /^(r|re|rev|reverse)$/i,
			'name': 'reverse',
			'parse': function(match) {
				return function(value) {
					var sign = value < 0 ? -1 : 1;
					var s = Math.abs(value) + '';
					var r = s.split('').reverse().join('');
					return sign * parseInt(r, 10);
				};
			},
		},
	];

	str = str.trim();
	for (let pat of patterns) {
		let match = pat.re.exec(str);
		if (match) {
			return new CalculatorButton(str, pat.name, pat.parse.apply(null, match));
		}
	}

	document.getElementById('error').textContent += 'Unrecognized operation: ' + str + '\n';
	return null;
}

function parse_operations(str) {
	var lines = str.split(
		/[\r\n]+/g
	).map(
		line => line.trim()
	).filter(
		line => line.length > 0
	);
	var buttons = lines.map(
		line => parse_single_operation(line)
	).filter(
		button => button !== null
	);
	return buttons;
}

function breadth_first_search(start_node, operations) {
	var g = new Graph(start_node);
	var queue = [start_node];
	while (queue.length > 0) {
		let node = queue.shift();
		if (node.moves_left <= 0) continue;  // or break
		for (let op of operations) {
			let new_value = op.exec(node.value);
			if (!Number.isInteger(new_value)) continue;  // Only integers. TODO: make this configurable.
			if (!g.get_node(new_value)) {
				let new_node = new Node(new_value, node.moves_left - 1);
				g.add_node(new_node);
				queue.push(new_node);
			}
			node.edges.push(new Edge(
				new_value,
				op.text,
				(g.get_node(new_value).moves_left < node.moves_left)
			));
		}
	}
	return g;
}

function explored_nodes_to_dot(graph) {
	var dot = 'digraph "" {\ngraph [rankdir=LR,nodesep=0.03125];\nnode [shape=box,style=rounded,margin=0];\n';
	for (let node of graph.node_list) {
		for (let edge of node.edges) {
			if (!edge.is_forward) continue;  // Only forward edges. TODO: make this configurable.
			dot += `"${node.value}" -> "${edge.dest}" [label="${edge.label}"];\n`;
		}
	}
	for (let [moves_left, nodes] of graph.nodes_by_moves) {
		dot += '{ rank=same; ';
		for (let node of nodes) {
			dot += `"${node.value}"; `;
		}
		dot += '}\n';
	}
	dot += '}';
	return dot;
}

function createSubtreeElement(parent_text, parent_tooltip, is_goal, children_elements) {
	var subtree = document.createElement('div');
	subtree.classList.add('subtree');

	if (is_goal) {
		subtree.classList.add('goal');
	}

	var parent = document.createElement('div');
	parent.classList.add('parent');
	parent.textContent = parent_text;
	parent.setAttribute('title', parent_tooltip);
	subtree.appendChild(parent);

	var children = document.createElement('div');
	children.classList.add('children');
	subtree.appendChild(children);

	if (!children_elements || children_elements.length == 0) {
		// No children.
		subtree.classList.add('leaf');
	} else {
		// With children.
		if (children_elements.every(elem => elem.classList.contains('leaf'))) {
			subtree.classList.add('before_leaves');
		}
		if (children_elements.some(elem => elem.classList.contains('goal'))) {
			subtree.classList.add('goal');
		}
		for (let child of children_elements) {
			children.appendChild(child);
		}
	}
	return subtree;
}

function createTreeFromGraph(graph) {
	function recursive_create_subtree_for_node(node, tooltip) {
		var edges = sorted(node.edges.filter(edge => edge.is_forward), edge => edge.dest);
		var children_elements = edges.map(edge => recursive_create_subtree_for_node(graph.get_node(edge.dest), edge.label));
		return createSubtreeElement(node.value, tooltip, node.is_goal, children_elements);
	}

	return recursive_create_subtree_for_node(graph.start_node, '');
}

function do_it() {
	var input_operations = document.getElementById('input_operations').value;
	var buttons = parse_operations(input_operations);
	// for (let b of buttons) {
	// 	console.log(b);
	// }
	var start_node = new Node(
		document.getElementById('input_start').valueAsNumber,
		document.getElementById('input_moves').valueAsNumber
	);

	var graph = breadth_first_search(start_node, buttons);

	var input_goal = document.getElementById('input_goal').valueAsNumber;
	var goal_node = graph.get_node(input_goal);
	if (goal_node) {
		goal_node.is_goal = true;
	}

	document.getElementById('debug_graphviz').value = explored_nodes_to_dot(graph);
	// console.log(nodes);
	var solution_tree = document.getElementById('solution_tree');
	solution_tree.innerHTML = '';
	solution_tree.append(createTreeFromGraph(graph));
}

function toggle_collapse(ev) {
	if (ev.target.classList.contains('parent')) {
		var subtree = ev.target.parentNode;
		if (subtree.classList.contains('subtree') && !subtree.classList.contains('leaf')) {
			subtree.classList.toggle('collapsed');
		}
	}
}

function init() {
	var solution_tree = document.getElementById('solution_tree');
	solution_tree.addEventListener('click', toggle_collapse);

	document.getElementById('the_form').addEventListener('submit', function(ev) {
		ev.preventDefault();
		document.getElementById('error').textContent = '';
		do_it();
	});
}

init();
