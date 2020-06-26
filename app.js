const rax = require('retry-axios');
const axios = require('axios');

const HOST_URL = 'https://motorway-challenge-api.herokuapp.com/api/login';
const LIST_URL_TEMPLATE = (pageNo, token) => `https://motorway-challenge-api.herokuapp.com/api/visits?page=${pageNo}&token=${token}`;

const RAX_CONFIG = {
    // Retry 3 times on requests that return a response (500, etc) before giving up.  Defaults to 3.
    retry: 3,
    // Retry twice on errors that don't return a response (ENOTFOUND, ETIMEDOUT, etc).
    noResponseRetries: 2,
};

// Setup retry interceptor     
const interceptorId = rax.attach(); 


//    {
//      "token": "1234567890abcdef"
//    }


//
//      {
//        "data": [
//          { "id": 1, "name": "Bill Murray", "date": "2018-09-02T09:11:00" },
//          { "id": 2, "name": "John Doe", "date": "2018-08-30T03:24:00" },
//        ],
//        "total": 100
//      }
//


const fakeResp1 = {
  total: 150,
  data: [
    { id: 0, name: 'Visitor #0', date: '2020-06-14T14:02:14+00:00' },
    { id: 1, name: 'Visitor #1', date: '2020-06-24T16:09:09+00:00' },
    { id: 10, name: 'Visitor #10', date: '2020-06-16T08:06:24+00:00' },
    {
      id: 100,
      name: 'Visitor #100',
      date: '2020-06-15T21:55:13+00:00'
    },
    {
      id: 101,
      name: 'Visitor #101',
      date: '2020-06-23T18:55:40+00:00'
    },
    {
      id: 102,
      name: 'Visitor #102',
      date: '2020-06-14T01:59:05+00:00'
    },
    {
      id: 103,
      name: 'Visitor #103',
      date: '2020-06-12T19:35:57+00:00'
    },
    {
      id: 104,
      name: 'Visitor #104',
      date: '2020-06-18T14:41:57+00:00'
    },
    {
      id: 105,
      name: 'Visitor #105',
      date: '2020-06-20T14:37:23+00:00'
    },
    {
      id: 106,
      name: 'Visitor #106',
      date: '2020-06-16T14:12:14+00:00'
    },
    {
      id: 107,
      name: 'Visitor #107',
      date: '2020-06-12T17:53:28+00:00'
    },
    {
      id: 108,
      name: 'Visitor #108',
      date: '2020-06-16T13:35:55+00:00'
    },
    {
      id: 109,
      name: 'Visitor #109',
      date: '2020-06-15T18:45:36+00:00'
    },
    { id: 11, name: 'Visitor #11', date: '2020-06-15T06:24:01+00:00' },
    {
      id: 110,
      name: 'Visitor #110',
      date: '2020-06-22T05:23:21+00:00'
    }
  ]
}



const fetchToken = async () =>  {
    try {
        const res = await axios.get(HOST_URL, { raxConfig: RAX_CONFIG });
        console.error('ttt 1', res.data);
        
        const { data: { token = false } = {} } = res;
        return token;
    } catch (err) {
        console.error('err tt', err);
        
        return false;
    }
};

const fetchUsers = async (page, token) =>  {

    try {
        console.error('fu1');
        
        const url = LIST_URL_TEMPLATE(page, token);
        console.error('url', url);
        
        const res = await axios.get(LIST_URL_TEMPLATE(page, token), { raxConfig: RAX_CONFIG });
        return {
            success: true,
            page: page,
            value: res.data
        };
    } catch (err) {
        return {
            success: false,
            page: page,
            value: {},
        }
    }
};

const fetchUsersPage = (token) => (page) => fetchUsers(page, token);

const calcPageIdsAfterFirstPage = (totalRecordsCount, firstPageRecordsCount) => {
        // console.error('AA  totalRecordsCount :', totalRecordsCount);
        // console.error('AA  firstPageRecordsCount:',firstPageRecordsCount );

    let pageIds = [];
    let originalPagesCount = 0;
    if (totalRecordsCount > firstPageRecordsCount) {
        if (firstPageRecordsCount === 0) {
            console.error('Error: invalid data, total count is non zero than first page haz zero length.');
            throw 'Error: invalid data';
        }
        const pagesCount = Math.ceil(totalRecordsCount / firstPageRecordsCount);
        originalPagesCount = pagesCount;
        // console.error('AA pagesCount  :',pagesCount  );
        for (let pageId = 2; pageId <= pagesCount; pageId++) {
            pageIds.push(pageId);    
        }
    }
    return {
        recordsPerPage: firstPageRecordsCount,
        originalPagesCount,
        pageIds
    };
};


const isWeekDay = (date) => {
    const indexOfWeek = date.getDay();
    /*
     *  weekday[0] = "Sunday";
     *  weekday[1] = "Monday";
     *  weekday[2] = "Tuesday";
     *  weekday[3] = "Wednesday";
     *  weekday[4] = "Thursday";
     *  weekday[5] = "Friday";
     *  weekday[6] = "Saturday";
     */
    return indexOfWeek > 0 && indexOfWeek < 7;
};

const TOTAL_DAY_MILLISECONDS = 1000 * 60 * 60 * 24;

const millisecondsFromStartOfDay = (date) => {
   const milliSeconds = date.getMilliseconds();
   const seconds = date.getSeconds();
   const minutes = date.getMinutes();
   const hours = date.getHours();
   return (
       milliSeconds +
       seconds * 1000 +
       minutes * 1000 * 60 +
       hours * 1000 * 60 * 60
   );
};

/**
 * returns start of date moment in milliseconds
 * @param date
 * @returns {number}
 */
const getUTCStartOfDateMilliseconds = date => {
    let dateCopy = new Date(date.getTime());
    dateCopy.setUTCHours(0, 0, 0, 0);
    return dateCopy.getTime();
};
/**
 *
 * @param start Date
 * @param end Date
 */
const isEndOfDayReachedBetweenDates = (start, end) =>
    getUTCStartOfDateMilliseconds(start) !== getUTCStartOfDateMilliseconds(end);

/**
 * This function finds all uniq original records
 *
 * @NOTE: 1: ignore daybreak, all calculations checks data for date of first request to server.
 * @NOTE: 2: responses from server has bug
 * >>> Data is not static.
 * >>> Visits could occur while you are fetching the API response.
 * >>> However, records can only be inserted and it would be always today’s visits.
 * >>> Visits cannot be undone.
 *
 * page1 records fetched
 * for page in one request can have ""today's visit insertion""
 * and for later request  [  by later means "totalCount > prevTotalCount" , than it later, only insertions)
 * can have no such insertions
 *
 * @NOTE: 3: cause we have insertions were is possibility that
 *  some pages fetched from different point of time (different totalCount value)
 *  this could leave to missed records in the beginning of some pages , if previously some record was inserted.
 *  This situation caused by NameSorting + new records.
 *
 * 0) Fetch tailing pages
 * 1) Find overlaps between pages
 * 2) skip "today inserted records"
 * 3) count "true original records"
 * 4) if originalTotal < sum of all "true original records"
 *      5) fetch page without overlap , they can contain missed "original records"
 *      6) repeat 5) until count of found "true original records" is equal to "originalTotal"
 *
 * @param firstPageResponse
 * @param otherPageResponses
 * @param fetchPageFn
 * @param startMoment
 * @param endMoment
 * @returns {{}}
 */
const fetchMissedPages = async (firstPageResponse, otherPageResponses, fetchPageFn, startMoment, endMoment) => {

    const { success, page, value: firstPageValue } = firstPageResponse;
    const { total: firstPageTotal = 0, data: firstPageRecords = [] } = firstPageValue;

    const isDataChanged = isTotalChanged(firstPageTotal, otherPageResponses);

    // const isEndOfDayReached = isEndOfDayReachedBetweenDates(startMoment, endMoment);

    // const result = pageResponses.reduce(page => {}, {
    //     visitorEntryCount: {}
    // });
    //

    return [firstPageResponse, ...otherPageResponses];
};

const isTotalChanged = (firstPageTotal, pageResponses) => {
    return pageResponses.some(page => page.total !== firstPageTotal);
};

/**
 * {
 *  success, // @boolean
 *  page, // @number
 *  value:
 *     {
 *         total, // @number
 *         data: [
 *             {
 *                 id, // @uniqId
 *                 name, // @string
 *                 date, // @string
 *             },
 *         ]
 *     }
 *  }
 * @param pageResponses
 * @param startMoment
 * @return {{}}
 */
const calcVisits = (pageResponses, startMoment) => {
    let nameVisits = {};
    const setNameVisit = (name) => nameVisits[name] === undefined ? 1: nameVisits[name] + 1;

    let viewedRecordIds = {};
    const isIdUsed = (id) => viewedRecordIds[id] === true;
    const setIdUsed = (id) => viewedRecordIds[id] = true;

    const startMomentUTCStartOfDate = getUTCStartOfDateMilliseconds(startMoment);
    const isPastDay = (date) => getUTCStartOfDateMilliseconds(date) < startMomentUTCStartOfDate;

    pageResponses.filter(({success}) => success)
        .forEach(({ value: { data = [] } = {} } = {}) =>
            data.filter(({ id }) => isIdUsed(id))
                .forEach(({ id, name, date: stringDate }) => {
                    setIdUsed(id);
                    let date = Date.parse(stringDate);
                    if (isWeekDay(date) && isPastDay(date)) {
                        setNameVisit(name);
                    }
                })
        );

    const namesSorted = Object.keys(nameVisits).sort();

    console.log(namesSorted);
    const sortedVisits = namesSorted.map(
        name => ({
            name,
            count: nameVisits[name]
        })
    );
    return sortedVisits;
};

const listUsers = async () => {

    try {

        console.error('a1');
        const token = await fetchToken();
        if (token === false) {
            console.error('Error: Auth request failed');
            return;
        }

        let startMoment = new Date();
        const pageFetcher = fetchUsersPage(token);
        const firstPageResponse = await pageFetcher(1);

        const { success, page, value: firstPageValue } = firstPageResponse;
        if (success === false) {
            console.error('Error: First Page request failed');
            return;
        }
        //const json = {"total":150,"data":[{"id":120,"name":"Visitor #14","date":"2020-06-20T16:08:40+00:00"},{"id":80,"name":"Visitor #14","date":"2020-06-17T05:54:38+00:00"},{"id":59,"name":"Visitor #14","date":"2020-06-23T22:55:42+00:00"},{"id":38,"name":"Visitor #14","date":"2020-06-18T14:56:55+00:00"},{"id":2,"name":"Visitor #14","date":"2020-06-22T20:14:09+00:00"},{"id":146,"name":"Visitor #15","date":"2020-06-19T08:39:16+00:00"},{"id":131,"name":"Visitor #15","date":"2020-06-23T23:13:46+00:00"},{"id":75,"name":"Visitor #15","date":"2020-06-18T17:52:27+00:00"},{"id":0,"name":"Visitor #15","date":"2020-06-11T18:19:43+00:00"},{"id":103,"name":"Visitor #16","date":"2020-06-19T19:05:08+00:00"},{"id":94,"name":"Visitor #16","date":"2020-06-21T17:02:43+00:00"},{"id":85,"name":"Visitor #16","date":"2020-06-22T03:29:56+00:00"},{"id":145,"name":"Visitor #17","date":"2020-06-25T14:07:10+00:00"},{"id":60,"name":"Visitor #17","date":"2020-06-24T00:18:28+00:00"},{"id":17,"name":"Visitor #17","date":"2020-06-22T00:34:46+00:00"}]};
        //const { total = 0, data: firstPageRecords = [] } = json;
        const { total = 0, data: firstPageRecords = [] } = firstPageValue;

        console.log('firstPageRecords', firstPageRecords);
        const firstPageRecordsCount = firstPageRecords.length;
        console.error('firstPageRecordsCount ', firstPageRecordsCount );
        console.error('typeof firstPageRecordsCount ', typeof firstPageRecordsCount );
        console.error('total', total);
        const {
            recordsPerPage,
            originalPagesCount,
            pageIds: unreadPageIds,
        } = calcPageIdsAfterFirstPage(total, firstPageRecordsCount);
        
        console.error('unreadPageIds', unreadPageIds);

        // const debugIds = [
        //     1, 1, 1, 1, 1, 1, 1,
        //     1, 1, 1, 1, 1, 1, 1,
        //     1, 1, 1, 1, 1, 1, 1,
        //     1, 1, 1, 1, 1, 1, 1,
        //     1, 1, 1, 1, 1, 1, 1,
        //     1, 1, 1, 1, 1, 1, 1,
        //     1, 1, 1, 1, 1, 1, 1,
        // ];
        // const debugIds = [1, ...unreadPageIds, unreadPageIds.length + 2, unreadPageIds.length + 3, 1, ...unreadPageIds, 1, ...unreadPageIds];
        // console.error('debugIds', debugIds);

        // const unreadPageRequests = [...debugIds].map(async id => await pageFetcher(id));
        const unreadPageRequests = [...unreadPageIds].map(async id => await pageFetcher(id));
        const unreadPagesResponses = await Promise.all(unreadPageRequests);
        // const unreadPagesResponses = await Promise.all(unreadPageRequests);

        console.error('firstPageRecords a1 JSON STRINGIFY', JSON.stringify(firstPageResponse) );
        console.error('firstPageRecords a1', (firstPageResponse) );
        console.error('unreadPagesResponses a1 JSON STRINGIFY', JSON.stringify(unreadPagesResponses) );
        console.error('unreadPagesResponses a1', (unreadPagesResponses) );



        let endMoment = new Date();

        let currentDateIsoString = startMoment.toISOString();

        console.log('currentDateIsoString', currentDateIsoString);

        const isDataChanged = isTotalChanged(total, unreadPagesResponses);
        console.log('isDataChanged', isDataChanged);

        // let finalDataSet = [firstPageResponse, ...unreadPagesResponses];

        let missedPagesResponses = [];
        if (!isDataChanged) {
            // fetch missed records if any
            missedPagesResponses = await fetchMissedPages(
                firstPageResponse,
                unreadPagesResponses,
                pageFetcher,
                startMoment,
                endMoment
            );
        }

        const visits = calcVisits(
            [firstPageResponse, ...unreadPagesResponses, ...missedPagesResponses],
            startMoment);

        console.log('visits');
        console.log(JSON.stringify(visits));
        // const indexGuard = {
        //     fetchedTotal: total,
        //     startMomentMilliseconds: startMoment.getTime(),
        //     endMomentMilliseconds: endMoment.getTime(),
        //     recordIds : [],
        //     visitorNames: {},
        //     visitorPages: {
        //         'visitorName' : {
        //             start: 1, end: 1,
        //         }
        //     },
        //     visitorRecords: {}
        // }
        //

        // { "id": 88, "name": "Visitor #88", "date": "2020-06-18T19:18:47+00:00" }
        // { "id": 158, "date": "2020-06-25T18:45:37.948Z", "name": "Visitor #89" }
    } catch (err) {
    
        console.error('err', err);
    }

};

listUsers();
