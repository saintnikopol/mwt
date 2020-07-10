To run:
 npm install
 node app.js


Current status: works with static data.
doesn't calculate volatile data

@NOTE: main problem is that ordering by name causes new records to appear inside of list.
This can cause shifting of page borders. As result if new records appears on page1,
than all pages queried at later moment will miss every "first record of page" but can contain in the end record of next page.
So simply fetching all pages from [0] to [LastPage] will not provide stable results.

@NOTE: All calculations are done starting from moment of first request.
If Daybreak was reached in process we still skip all record from day of "moment than script was started".

[Done] You need to write a script that calculates how many times each visitor has visited the office.

**Please take into account:**

[Used] - The whole dataset is ordered by the `name` field
[Done] - We are only interested in tracking weekday visits, weekend visits should be ignored.
[WIP] - Data is not static. Visits could occur while you are fetching the API response.
[USED]    However, records can only be inserted and it would be always today’s visits.
[UNTRUE*] Visits cannot be undone. ( *for new records).
[DONE] - We should ignore visits from the current day, since the day is still in progress
[DONE] - It's better to execute parallel requests to API.
[NOT IMPLEMENTED] - Bonus points for request pool (not necessary).
[DONE] - Bonus points for retries.


@NOTE: Visits cannot be undone
*New records appear at random place, but they are not stored