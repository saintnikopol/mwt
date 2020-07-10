To run:
 npm install
 node app.js


Current status: Completed.

@NOTE: main problem is that ordering by name causes new records to appear inside of list.
This can cause shifting of page borders. As result if new records appears on page1,
than all pages queried at later moment will miss every "first record of page" but can contain in the end record of next page.
So simply fetching all pages [0], [1], [2] ... up to [LastPage] will not provide stable results.

@NOTE: All calculations are done starting from moment of first request.
If Daybreak was reached in process we still skip all record from day of "moment than script was started".

[Done] You need to write a script that calculates how many times each visitor has visited the office.

**Please take into account:**

[Used]      - The whole dataset is ordered by the `name` field
[Done]      - We are only interested in tracking weekday visits, weekend visits should be ignored.
[WIP]       - Data is not static. Visits could occur while you are fetching the API response.
[USED]      - However, records can only be inserted and it would be always today’s visits.
[UNTRUE*]   - Visits cannot be undone. ( *for new records).
[DONE]      - We should ignore visits from the current day, since the day is still in progress
[DONE]      - It's better to execute parallel requests to API.
[NOT IMPLEMENTED] - Bonus points for request pool (not necessary).
[DONE]      - Bonus points for retries.

@WARNING:
@WARNING:
@WARNING:
@NOTE: "Visits cannot be undone"
*New records appear at random place, but they are not stored.
On each new request new record can appear with already used "id" for any user "name" and any "date"

@NOTE: Where is 4 main configuration constants:
// Enable logging
const IS_LOG_RESPONSES = false;

// substitute network requests to log dumps
const IS_DEBUG_FROM_DUMP = false;

// log dump bootstrap path configuration, created via "IS_LOG_RESPONSES=true"
const DUMP_FILE_PATH = 'results_example_61_of_150_static/log_2020_7_10__7.57.59_';

// default recursion limit
const MAX_RECURSIVE_SEARCH_CYCLES = 10;

// additional debug validation testing
// data stored into files: 'logs/<DUMP_FILE_PATH>validate_NN_<stepInfo>.json'
const IS_VALIDATION_ENABLED = false

@NOTE: To debug any scenario:
1) set IS_LOG_RESPONSES=true
2) run script once via "node app.js"
3) set DUMP_FILE_PATH to the content of 'logs/log_YYYY_M_DD__H.MM.SS__BOOTSTRAP' file it should be
	'log_YYYY_M_DD__H.MM.SS_' or 'log_2020_7_10__5.47.48_'
4) run script once more via "node app.js"
	 you will get same output as on step2. all requests are fetched from file-logs


@NOTE: IS_VALIDATION_ENABLED =