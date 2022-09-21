Calculator: The Game — Solver
=============================

[Donation - buy me a coffee](https://denilson.sa.nom.br/donate.html)

This is a tool to help solving levels from [Calculator: The Game][game], (a game [for Android][android] and [for iOS][ios]). There is also [a non-official re-implementation of the game playable in the browser](https://github.com/Jorger/Calculator_The_Game_ReactJS).

The game consists of a calculator with only a few buttons for very specific operations, and a limited number of moves (button presses) to get to a specific goal number.

This solver explores all possible numbers that can be reached given the initial conditions. This is done by a [breadth-first search][bfs] that builds a [directed][] [graph][] of numbers.

[Open the solver online, in your browser!][solver]

How to use this solver?
-----------------------

1. Input the initial game state: number of moves and the initial value.
2. Input all possible operations, one per line.
3. Optionally, input the goal.
4. Press the button.
5. Enjoy the results.

### What are the operations recognized by the solver?

These are all the operations recognized by the solver. Some of them support multiple syntaxes for the the same results.

* Addition: `+1`, `+42`
* Subtraction: `-1`, `-42`
* Multiplication: `x2`, `X2`, `*2`, `x-3`, `X-3`, `*-3`
* Division: `/2`, `/-3`
* Typing numbers: `2`, `42`
* Backspace: `<<`, `b`, `back`, `backspace`
* Substitution: `1=>2`, `42=>13`
* Exponentiation: `x**2`, `x^2`, `x²`, `**3`, `^3`, `³`
* Signal: `+/-`, `-/+`, `+-`, `-+`, `±`, `∓`
* Reverse: `r`, `re`, `rev`, `reverse`
* Sum: `s`, `sum`
* Shift: `<`, `>`, `<shift`, `shift>`
* Mirror: `m`, `mi`, `mir`, `mirror`

### Not supported (yet)

* `[+] 1`, which changes the values of the other buttons.
    * Note that pressing `[+] 1` will change a `-2` to `-3`.
    * What happens if there are multiple buttons like this? Will this button affect the value of other `[+] x` buttons?
* `Store`, which can hold a value (zero-cost) and type that value (1-movement cost).
    * How does it interact with `[+] 1`? Maybe it doesn't, and they can't be used together.

ELI5 How does this solver work?
-------------------------------

(*ELI5* means *Explain Like I'm Five*.)

In order to understand how this solver work, let's look at one sample level, and let's learn how you can solve any level yourself, using just a piece of paper.

    Moves: 2
    Goal: 6
    Initial number: 0
    Operations: +2 +4

The game begins with `2 moves` and the number `0`. That's the initial state, and we have to put it on paper. Write the number `0` somewhere in the paper, and write `2 moves` near it. You may even draw a circle around those two numbers, or write them as `(0,2)`.

We have two possible operations: `+2` and `+4`. Which one leads to the goal? We don't know yet, so we are going to explore both of them. `0 +2` is `2`, but since we spent one move, we now have `1 move` left. So put it on paper: `2` with `1 move` (from now on, I'll just use the `(2,1)` notation because it is shorter). Also draw an arrow from `(0,2)` towards `(2,1)`, and write the operation `+2` at the arrow.

We have to do the same for the second operation: `0 +4` is `4`, with only `1 move` left, so write down `(4,1)` and draw an arrow from the inital state to this new state. We should have something like this on paper:

    (0,2)
      ├── +2 ──> (2,1)
      └── +4 ──> (4,1)

Since there are only two operations, we've explored all possible game states that we can get after we do one move. How do we continue from there? It's simple, we repeat the exact same steps, but starting from `(2,1)` and `(4,1)`. Let's continue…

Applying `+2` to `(2,1)` leads to `2 +2 = 4` with `0 moves` left. So we can write down `(4,0)` and draw an arrow.

    (0,2)
      ├── +2 ──> (2,1)
      │            └── +2 ──> (4,0)
      └── +4 ──> (4,1)

But, if we are paying attention, we can notice that we already know how to get to `4`, and we even know how to get there in fewer moves. So we don't need to write `(4,0)`. Or we can cross it to mark that we don't want to explore it anymore.

Let's continue with the next operation… Applying `+4` to `(2,1)` results in `(6,0)`. `6` already is our goal, so we don't need to go any further. However, for the sake of the explanation, I will not stop.

    (0,2)
      ├── +2 ──> (2,1)
      │            ├── +2 ──> (4,0) ✗
      │            └── +4 ──> (6,0)
      └── +4 ──> (4,1)

We've applied all the operations to `(2,1)`, it's time to move to `(4,1)` and repeat the same steps. Applying `+2` to `(4,1)` results in `(6,0)`, which is the exact same state (i.e. number and moves) that we arrived earlier. Instead of writing `(6,0)` twice, we can just draw an arrow to the previous one.

    (0,2)
      ├── +2 ──> (2,1)
      │            ├── +2 ──> (4,0) ✗
      │            └── +4 ──> (6,0)
      └── +4 ──> (4,1)          ↑
                   └── +2 ──────┘

What does it mean? It means we have multiple paths to arrive at the state `(6,0)`. Since `6` is the goal, it means we have two solutions for getting to the goal: `+2 +4` and `+4 +2`.

But we aren't finished with `(4,1)` yet. We still have to apply `+4`, which results in `(8,0)`.

    (0,2)
      ├── +2 ──> (2,1)
      │            ├── +2 ──> (4,0) ✗
      │            └── +4 ──> (6,0)
      └── +4 ──> (4,1)          ↑
                   ├── +2 ──────┘
                   └── +4 ──> (8,0)

Now, we've explored all operations for all game states that have only one move left. This means we've discovered all possible game states for zero moves left. What's next? Well, since the new game states we've discovered don't have any moves left, we can stop the process. Otherwise, we would repeat the same steps (applying all operations) for all (intermediate) game states until we get to all possible final states (i.e. no moves left).

And what's the result of all this work? We get a list of all possible outcomes of a game. We get a list of all possible numbers we can reach given the inital conditions. And we can trace a path of all operations needed to reach any number.

TODO
----

This is the list of dev tasks that are planned (but with no date):

* Proper error handling and error reporting (both error messages and CSS styling for wrong input).
* Better layout.

[solver]: http://denilsonsa.github.io/calculator-the-game-solver/solver.html
[game]: http://www.simplemachine.co/game/calculator-the-game/
[android]: https://play.google.com/store/apps/details?id=com.sm.calculateme
[ios]: https://itunes.apple.com/us/app/calculator-the-game/id1243055750
[bfs]: https://en.wikipedia.org/wiki/Breadth-first_search
[graph]: https://en.wikipedia.org/wiki/Graph_(abstract_data_type)
[directed]: https://en.wikipedia.org/wiki/Directed_graph
