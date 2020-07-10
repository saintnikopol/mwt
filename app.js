const rax = require('retry-axios');
const axios = require('axios');

const fs = require('fs');

const HOST_URL = 'https://motorway-challenge-api.herokuapp.com/api/login';
const LIST_URL_TEMPLATE = (pageNo, token) => `https://motorway-challenge-api.herokuapp.com/api/visits?page=${pageNo}&token=${token}`;

// RETRY SETUP START
const RAX_CONFIG = {
    // Retry 3 times on requests that return a response (500, etc) before giving up.  Defaults to 3.
    retry: 3,
    // Retry twice on errors that don't return a response (ENOTFOUND, ETIMEDOUT, etc).
    noResponseRetries: 2,
};
// Setup retry interceptor
const interceptorId = rax.attach();
// RETRY SETUP END

const IS_LOG_RESPONSES = true;

const IS_DEBUG_FROM_DUMP = true;

const DUMP_FILE_PATH = 'log_2020_7_10__1.32.38_';
// const DUMP_FILE_PATH = 'log_2020_7_9__22.29.11_';

const MAX_RECURSIVE_SEARCH_CYCLES = 4;

const fetchTokenFn = async () =>  {
    try {
        const res = await axios.get(HOST_URL, { raxConfig: RAX_CONFIG });
        console.error('token: ', res.data);
        
        const { data: { token = false } = {} } = res;
        return token;
    } catch (err) {
        console.error('token error: ', err);
        
        return false;
    }
};

const fetchUsers = async (page, token) =>  {
    console.log("[fetchUsers] typeof page === ", typeof page, page);

    try {
        const url = LIST_URL_TEMPLATE(page, token);
        console.error('url', url);
        
        const res = await axios.get(LIST_URL_TEMPLATE(page, token), { raxConfig: RAX_CONFIG });
        console.log("[fetchUsers][SUCCESS->return]const fetchUsers = async (page, token) =>  { typeof page === ", typeof page, page);

        return {
            success: true,
            page: page,
            value: res.data
        };
    } catch (err) {
        console.log("[fetchUsers] } catch (err) {", err);
        console.log("[fetchUsers][  ERROR->return]const fetchUsers = async (page, token) =>  { typeof page === ", typeof page, page);
        return {
            success: false,
            page: page,
            value: {},
        }
    }
};

const fetchUsersPageFnFactory = token => page => fetchUsers(page, token);

const pageIdListFetchFnFactory = pageFetcherFn => async unreadPageIds =>
    await Promise.all([...unreadPageIds].map(async id => await pageFetcherFn(id)));

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

const calcTailPageIds = (maxKnownTotal, firstPageTotal, recordsPerPage) => {
    console.log("const calcTailPageIds = (maxKnownTotal, firstPageTotal, recordsPerPage) => { recordsPerPage === ", recordsPerPage);
    console.log("const calcTailPageIds = (maxKnownTotal, firstPageTotal, recordsPerPage) => { firstPageTotal === ", firstPageTotal);
    console.log("const calcTailPageIds = (maxKnownTotal, firstPageTotal, recordsPerPage) => { maxKnownTotal === ", maxKnownTotal);
    const lastFetchedPageId = Math.ceil(firstPageTotal / recordsPerPage);
    const maxKnownTotalPageId = Math.ceil(maxKnownTotal / recordsPerPage);

    const isLastPageFullyFetched = lastFetchedPageId * recordsPerPage === firstPageTotal;

    const firstUnfetchedPageId = isLastPageFullyFetched ? lastFetchedPageId + 1 : lastFetchedPageId;
    console.log("const firstUnfetchedPageId = isLastPageFullyFetched ? lastFetchedPageId + 1 : lastFetchedPageId; firstUnfetchedPageId === ", firstUnfetchedPageId);
    let tailPageIds = [];
    for (let tailPageId = firstUnfetchedPageId; tailPageId <= maxKnownTotalPageId; tailPageId++) {
        tailPageIds.push(tailPageId);
        console.log("tailPageIds.push(tailPageId) tailPageId === ", tailPageId);
    }
    return tailPageIds;
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

const isTailCaughtFn = (tailPagesResponses, recordsPerPage) => {
    if (tailPagesResponses.length === 0) {
        return true;
    }
    const lastPageResponse = tailPagesResponses[tailPagesResponses.length - 1];
    const { success, page: pageId, value: {total = 0, data = []} = {} } = lastPageResponse;
    // page is cut, so end is found
    if (data.length < recordsPerPage) {
        return true;
    }

    // we fetched all records on last page
    if (pageId * recordsPerPage === total) {
        return true;
    }

    // if (lastName)
    return false;
};

/**
 * Analyze Page data and set possible boundaries
 *
 * @param pageId
 * @param recordsPerPage
 * @param pageTotalRecordsCount
 * @param currentPageRecordCount
 * @param shiftWithoutInserted
 * @param trueRecordsCount
 * @param trueRecordsOnPageCount
 * @returns {{isMinMaxTrueEqual: boolean, rightMinTrueIndex: number, leftMaxTrueIndex: number, rightMaxTrueIndex: number, leftMinTrueIndex: number}}
 */
function calcPageBoundaries(pageId, recordsPerPage, pageTotalRecordsCount, currentPageRecordCount, shiftWithoutInserted,
                            trueRecordsCount, trueRecordsOnPageCount) {
    const fetchedRecordsOnLeftCount = (pageId - 1) * recordsPerPage;
    const fetchedRecordsOnRightCount =
        pageTotalRecordsCount - ((pageId - 1) * recordsPerPage + currentPageRecordCount);

    const minTrueRecordsOnRightCount = Math.max(0, fetchedRecordsOnRightCount - shiftWithoutInserted);
    const minPossibleShiftWithoutInsertedOnRightCount = Math.min(fetchedRecordsOnRightCount, shiftWithoutInserted);

    const rightMaxTrueIndex = Math.max(0, trueRecordsCount - minTrueRecordsOnRightCount - 1);
    const rightMinTrueIndex = Math.max(
        0,
        fetchedRecordsOnLeftCount - minPossibleShiftWithoutInsertedOnRightCount + trueRecordsOnPageCount  - 1
    );

    const rightMinMaxDistance = rightMaxTrueIndex - rightMinTrueIndex;
    const leftMaxTrueIndex = fetchedRecordsOnLeftCount;
    const leftMinTrueIndex = Math.max(0, leftMaxTrueIndex - rightMinMaxDistance);
    const isMinMaxTrueEqual = leftMinTrueIndex === leftMaxTrueIndex;
    return {rightMaxTrueIndex, rightMinTrueIndex, leftMaxTrueIndex, leftMinTrueIndex, isMinMaxTrueEqual};
}

const scanPageResponse = (mutableRecordsIndex, pageIndex, pageResponse, isStringDatePastFn, fileLogger, recursiveGuardCount) => {

    const {
        /*success,*/
        page: pageId,
        value: {
            total: pageTotalRecordsCount,
            data = [],
        },
    } = pageResponse;

    const { trueRecordsCount, recordsPerPage } = mutableRecordsIndex;
    let trueRecordsIds = {};
    let insertedRecordsIds = {};
    let trueRecordsIdList = [];
    let allRecordsIdList = [];
    let trueUniqRecordsOnPageCount = 0;
    let insertedUniqRecordsOnPageCount = 0;
    data.forEach((record, recordIndex) => {
        const { id, name = '', date: stringDate } = record;
        // console.log('[', id, '] stringDate', stringDate);
        // console.log('[', id, '] isStringDatePastFn(stringDate)', isStringDatePastFn(stringDate));
        const isInsertedRecord = !isStringDatePastFn(stringDate);

        if (isInsertedRecord) {
            insertedRecordsIds[id] = true;
        } else {
            trueRecordsIds[id] = true;
            trueRecordsIdList.push(id);
        }

        fileLogger(`XXXXXXXXXXXXX_2.1_record[id${id}][pi-${pageIndex}_pn-${pageId}--${recordIndex}]_r${recursiveGuardCount}.json`, JSON.stringify({record, isInsertedRecord}, null, 4));

        if (mutableRecordsIndex.records[id] === undefined) {
            mutableRecordsIndex.records[id] = {
                pageIndexes: {
                    [pageIndex]: recordIndex,
                },
                isInsertedRecord,
                name,
                /*stringDate,*/
            };
            if (isInsertedRecord) {
                insertedUniqRecordsOnPageCount++;
            } else {
                trueUniqRecordsOnPageCount++;
            }
        } else if (
          mutableRecordsIndex.records[id].pageIndexes[pageIndex] === undefined
        ) {
                mutableRecordsIndex.records[id].pageIndexes[pageIndex] = recordIndex;
                mutableRecordsIndex.overlapRecordIds[id] = true;
        }
        allRecordsIdList.push(id);
    });



    const currentPageRecordCount = data.length;
    const trueRecordsOnPageCount = trueRecordsIdList.length;

    const isCutTailPage = recordsPerPage > currentPageRecordCount;
    const isFullTailPage = recordsPerPage * pageId === pageTotalRecordsCount;
    const isTailPage = isCutTailPage || isFullTailPage;

    const isCanBeTailPage = pageId * recordsPerPage >= pageTotalRecordsCount;
    if (isCutTailPage && !isCanBeTailPage) {
        console.error('Data error: tail page is not last possible page.');
    }

    const insertedRecordsOnPageCount = allRecordsIdList.length - trueRecordsIdList.length;


    // const maxRecordsOnRightWithInsertedCount = (isCutTailPage || isFullTailPage) ? 0 :
    //     pageTotalRecordsCount

    // 150

    ////
    // 1 0..14
    // 2 15..29
    // 3 30..44
    // 4 45..59
    // 5 60..74
    // 6 75..89
    // 7 90..104
    // 8 105..119
    // 9 120..134
    // 10 135..149
    // 11 150..165

    // pageId = 10, shiftWIRC = 25
    // 0       trueRecordsOnPageCount     trueRecordsCount // pageTotalRecordsCount
    // minIdx
    //         EmptyLeftIdx
    //             TruRecCount
    //                      allRight
    //                        --inserted
    //                                     MaxTrueIndex
    //                                      /MaxIndex
    // 0       135    13     149-2          [149/176]      150 // 177 |175   // 27 // 25
    // 0       135    13     149-2          [149/166]      150 // 167 |165   // 17 // 15
    // 0       135    13+2   149            [149/156]      150 // 157 |155   // 7  // 5

    // 0       135    13     147            [149/176]      150 // 177 |175   // 27 // 25
    // 0       135    13     147            [149/166]      150 // 167 |165   // 17 // 15
    // 0       135    13     147            [149/156]      150 // 157 |155   // 7  // 5


    // maxPossibleRecordsOnRight = pageTotalRecordsCount - ((pageId - 1) * recordsPerPage +  currentPageRecordCount);

    /// 10   // 177 : 10 I ..x.j.x..J            13, 12    + 27 / --2 | 25
    /// 10   // 167 : 10 I ..x.j.x..J            13, 12    + 27 / --2 | 17
    /// 10   // 157 : 10 I ..x.j.x..J            13, 12    + 27 / --2 | 7

    const shiftWithInserted = pageTotalRecordsCount - trueRecordsCount;
    const shiftWithoutInserted = shiftWithInserted - insertedRecordsOnPageCount;
    const {
        rightMaxTrueIndex,
        rightMinTrueIndex,
        leftMaxTrueIndex,
        leftMinTrueIndex,
        isMinMaxTrueEqual,
    } = calcPageBoundaries(pageId, recordsPerPage, pageTotalRecordsCount, currentPageRecordCount, shiftWithoutInserted,
        trueRecordsCount, trueRecordsOnPageCount);

    let pageScan = {
        pageIndex,
        pageId,
        pageTotalRecordsCount,
        isCutTailPage,
        isFullTailPage,
        isTailPage,

        shiftWithInserted,
        shiftWithoutInserted,

        trueRecordsIds,
        trueRecordsIdList,
        insertedRecordsIds,
        allRecordsIdList,

        trueRecordsOnPageCount,
        trueUniqRecordsOnPageCount,
        insertedRecordsOnPageCount,
        insertedUniqRecordsOnPageCount,

        leftMinTrueIndex,
        leftMaxTrueIndex,
        rightMinTrueIndex,
        rightMaxTrueIndex,

        isMinMaxTrueEqual,
    };
    return pageScan;
};

// /**
//  *
//  * @param overlapRecords
//  * @returns {{
//     [pageIndex]: {
//         [recordIndex]: {
//             [pageIndexXX]: 'recordIndexInXX',
//             [pageIndexYY]: 'recordIndexInYY',
//         },
//         [recordIndex2]: {
//             [pageIndex2XX]: 'recordIndex2InXX',
//             [pageIndex2YY]: 'recordIndex2InYY',
//         },
//     }
// }}
//  */
// function getPageOverlapsWithRecordsIndexes(overlapRecords) {
//     return overlapRecords.reduce((accPageOverlapsWith, overlapRecord) => {
//             const {pageIndexes, isInsertedRecord} = overlapRecord;
//             const overlappedPageIndexes = Object.keys(pageIndexes);
//             overlappedPageIndexes.forEach(pageIndex => {
//                 const recordIndex = pageIndexes[pageIndex];
//                 if (accPageOverlapsWith[pageIndex] === undefined) {
//                     accPageOverlapsWith[pageIndex] = {
//                         /// [recordIndex] : { [pageIndex1]: recordIndex13, [pageIndex2]: recordIndex7}
//                         [recordIndex]: {},
//                     };
//                 } else if (accPageOverlapsWith[pageIndex][recordIndex] === undefined) {
//                     accPageOverlapsWith[pageIndex][recordIndex] = {};
//                 }
//
//                 overlappedPageIndexes.filter(
//                     overlappedPageIndex => overlappedPageIndex !== pageIndex
//                 ).forEach(overlappedPageIndexFiltered =>
//                     accPageOverlapsWith[pageIndex][recordIndex][overlappedPageIndexFiltered] =
//                         pageIndexes[overlappedPageIndexFiltered]
//                 );
//             });
//             console.log("return accPageOverlapsWith; accPageOverlapsWith === ", accPageOverlapsWith);
//             return accPageOverlapsWith;
//         },
//         {});
// }

/**
 *
 * @param overlapRecords
 * @returns {{
    [pageIndex]: {
        [pageIndexXX]: true,
        [pageIndexYY]: true,
        [pageIndex2XX]: true,
        [pageIndex2YY]: true,
    }
  }}
 */
function getPageOverlaps(overlapRecords) {
    return overlapRecords.reduce((accPageOverlapsWith, overlapRecord) => {
            const { pageIndexes } = overlapRecord;
            const overlappedPageIndexes = Object.keys(pageIndexes);
            overlappedPageIndexes.forEach(pageIndex => {
                if (accPageOverlapsWith[pageIndex] === undefined) {
                    accPageOverlapsWith[pageIndex] = {/* [pageIndex1]: true, [pageIndex2]: true,*/};
                }

                overlappedPageIndexes.filter(
                    overlappedPageIndex => overlappedPageIndex !== pageIndex
                ).forEach(overlappedPageIndexFiltered =>
                    accPageOverlapsWith[pageIndex][overlappedPageIndexFiltered] = true
                );
            });
            return accPageOverlapsWith;
        },
        {});
}

/**
 * Fetches whole chain of linked pages
 * @NOTE: recursive
 *
 * @param pageOverlaps  // @see getPageOverlaps()
 * @param newKeys    // {[pageIndex]: true, ...}
 * @param existingPageChainIndexEntries // {[pageIndex]: true, ...}
 * @returns {*}
 */
function fetchSingleChainedOverlap (pageOverlaps, newKeys, existingPageChainIndexEntries = {}) {
    let foundNewChainEntries = {};

    Object.keys(newKeys).forEach(pageIndex => {
        if (pageOverlaps[pageIndex] !== undefined) {
            Object.keys(pageOverlaps[pageIndex])
                .filter(newChildKeyPageIndex =>
                    (
                        existingPageChainIndexEntries[newChildKeyPageIndex] === undefined &&
                        newKeys[newChildKeyPageIndex] === undefined
                    )
                )
                .forEach(childNewKey => foundNewChainEntries[childNewKey] = true)

        }
    });

    const hasNewEntries = Object.keys(foundNewChainEntries).length > 0;
    const nextExistingKeys = Object.assign({}, existingPageChainIndexEntries, newKeys);
    if (!hasNewEntries) {
        return nextExistingKeys;
    }
    return fetchSingleChainedOverlap(pageOverlaps, foundNewChainEntries, nextExistingKeys);
}

/**
 *
 * @param topLevelPageIndexes
 * @param pageOverlaps
 * @returns {[
 *     {
 *      [pageIndex1]:true,
 *      [pageIndex2]:true,
 *      [pageIndex3]:true,
 *      ...
 *      },
 *      ...
 * ]}
 */
function fetchChainedOverlaps (topLevelPageIndexes, pageOverlaps) {
    let usedPageIndexes = {};
    let pageIndexesChains = [];
    topLevelPageIndexes.forEach(topLevelPageIndex => {
        if (usedPageIndexes[topLevelPageIndex] === undefined) {
            let chain = fetchSingleChainedOverlap(pageOverlaps, {}, {[topLevelPageIndex]: true});
            Object.assign(usedPageIndexes, chain);
            pageIndexesChains.push(chain);
        }
    });
    return pageIndexesChains;
}

function strcmp(a, b)
{
    return (a < b ? -1: (a > b ? 1: 0));
}

/**
 * Sort pages inside a chain
 *
 * @param recordsIndex
 * @param chainOfPageIndexes
 * @param pageScanResults
 * @param scannedPageIndexes
 * @returns {{lastRecordId: *, lastRecordName: *, trueRecordsIds: {}, trueRecordsOnChainCount: number, insertedRecordsIds: {}, firstRecordName: *, insertedRecordsOnChainCount: number, allRecordsOnChainCount: number, truePageIndexesOrder: string[], firstRecordId: *, pageIndexes: any}}
 */
function findBorderRecordsAndSortChain(recordsIndex, chainOfPageIndexes, pageScanResults, scannedPageIndexes) {

    let pageIndexesList = Object.keys(chainOfPageIndexes);
    if (pageIndexesList.length === 0) {
        console.error('Error: chain is empty');
    }
    const pickName = id => recordsIndex.records[id].name;
    const pickPage = pageIndex => pageScanResults[pageIndex];
    const pickPageFirstRecordId = pageIndex => pickPage(pageIndex).allRecordsIdList[0];
    const pickPageFirstRecordName = pageIndex => pickName(pickPageFirstRecordId(pageIndex));
    const pickPageLastRecordId = pageIndex =>
        pickPage(pageIndex).allRecordsIdList[pickPage(pageIndex).allRecordsIdList.length-1];
    const pickPageLastRecordName = pageIndex => pickName(pickPageLastRecordId(pageIndex));

    // sort by firstRecordName to catch first record 'name'
    pageIndexesList.sort((a, b) =>
        strcmp(pickPageFirstRecordName(a), pickPageFirstRecordName(b))
    );
    // store natively sorted page order
    const truePageIndexesOrder = [...pageIndexesList];

    const firstRecordId = pickPageFirstRecordId(truePageIndexesOrder[0]);
    const firstRecordName = pickName(firstRecordId);

    // sort by firstLastName to catch last record 'name'
    pageIndexesList.sort((a, b) =>
        strcmp(pickPageLastRecordName(a), pickPageLastRecordName(b))
    );

    const lastRecordId = pickPageLastRecordId(pageIndexesList[pageIndexesList.length - 1]);
    const lastRecordName = pickName(lastRecordId);

    const trueRecordsIds = {};
    const insertedRecordsIds = {};

    truePageIndexesOrder.map(pickPage).forEach(pageScan => {
        Object.assign(trueRecordsIds, pageScan.trueRecordsIds);
        Object.assign(insertedRecordsIds, pageScan.insertedRecordsIds);
    });

    const trueRecordsOnChainCount = Object.values(trueRecordsIds).length;
    const insertedRecordsOnChainCount = Object.values(insertedRecordsIds).length;

    return ({
        truePageIndexesOrder,
        pageIndexes: Object.assign({}, chainOfPageIndexes),

        firstRecordId,
        lastRecordId,
        firstRecordName,
        lastRecordName,

        trueRecordsIds,
        insertedRecordsIds,

        trueRecordsOnChainCount,
        insertedRecordsOnChainCount,
        allRecordsOnChainCount: trueRecordsOnChainCount + insertedRecordsOnChainCount,
    });
}

/**
 * Sort chains and page inside chains using firstRecordName
 *
 * @param recordsIndex
 * @param chainsOfPageIndexes
 * @param pageScanResults
 * @param scannedPageIndexes
 * @returns {Uint8Array | BigInt64Array | *[] | Float64Array | Int8Array | Float32Array | Int32Array | Uint32Array | Uint8ClampedArray | BigUint64Array | Int16Array | Uint16Array}
 */
function findBorderRecordsAndSortChains(recordsIndex, chainsOfPageIndexes, pageScanResults, scannedPageIndexes) {
    /**
     *
     * [
     *  {
     *     truePageIndexesOrder, // []
     *     pageIndexes,     // {}
     *
     *     firstRecordId,
     *     lastRecordId,
     *     firstRecordName,
     *     lastRecordName,
     *
     *     trueRecordsIds,
     *     insertedRecordsIds,
     *
     *     trueRecordsOnChainCount,
     *     insertedRecordsOnChainCount,
     *     allRecordsOnChainCount,
     * },
     * ...
     * ];
     */
    let pageSortedChains = chainsOfPageIndexes.map(chainOfPageIndexes =>
        findBorderRecordsAndSortChain(recordsIndex, chainOfPageIndexes, pageScanResults, scannedPageIndexes)
    );
    let fullySortedChains = pageSortedChains.sort((a, b) =>
        strcmp(a.firstRecordName, b.firstRecordName)
    );
    return fullySortedChains;
}

/**
 * Find gaps coordinates
 * @param recordsIndex
 * @param scannedPageIndexes
 * @param fullySortedChains
 * @param fileLogger
 * @param recursiveGuardCount
 * @returns {{left: *, right: *}[]}
 */
function calcMissedRecordsPossiblePositions(recordsIndex, scannedPageIndexes, fullySortedChains, fileLogger, recursiveGuardCount ) {
    //chain minRightIndex can't be greater than next chain minLeftIndex;
    const {
        trueRecordsCount,
        trueRecordsFoundCount,
        insertedRecordsFoundCount,
        maxKnownTotalRecordCount,
        // recordsPerPage,
    } = recordsIndex;
    const trueRecordsMissedCount = trueRecordsCount - trueRecordsFoundCount;
    const insertedRecordsMissedCount = maxKnownTotalRecordCount - trueRecordsCount - insertedRecordsFoundCount;
    const gapLength = trueRecordsMissedCount + insertedRecordsMissedCount;
    console.log("const gapLength = trueRecordsMissedCount + insertedRecordsMissedCount; gapLength === ", gapLength);
    fileLogger(`XXXXXXXXXXXXX_5.1_gapLength_r${recursiveGuardCount}.json`, JSON.stringify(gapLength, null, 4));

    const stripeLengths = fullySortedChains.map(chain => chain.allRecordsOnChainCount);
    console.log("const stripeLengths = fullySortedChains.map(chain => chain.allRecordsOnChainCount); stripeLengths === ", stripeLengths);
    fileLogger(`XXXXXXXXXXXXX_5.2_stripeLengths_r${recursiveGuardCount}.json`, JSON.stringify({stripeLengths}, null, 4));

    const endIndex = maxKnownTotalRecordCount - 1;

    const lastPossibleGapIndex = maxKnownTotalRecordCount - stripeLengths[stripeLengths.length - 1] - 1;

    const totalStripesLength = stripeLengths.reduce((acc, stripeLength) => acc + stripeLength, 0);
    let xxx = {
        trueRecordsCount,
        trueRecordsFoundCount,
        insertedRecordsFoundCount,
        maxKnownTotalRecordCount,
        // recordsPerPage,
        trueRecordsMissedCount,
        insertedRecordsMissedCount,
        gapLength,
        endIndex,
        lastPossibleGapIndex,
        totalStripesLength,
    };
    console.log('xxx', xxx);
    fileLogger(`XXXXXXXXXXXXX_5.3_xxx_r${recursiveGuardCount}.json`, JSON.stringify(xxx, null, 4));

    const gapsStarts = stripeLengths.reduce(
      (acc, stripeLength, index, stripes) => {
          if (index < stripes.length - 1) {
              let prev = index === 0 ? 0 : acc[index - 1];
              acc.push(prev + stripeLength);
          }
          return acc;
      }, []);
    fileLogger(`XXXXXXXXXXXXX_5.4_gapsStarts_r${recursiveGuardCount}.json`, JSON.stringify({xxx, gapsStarts}, null, 4));

    const gapEndsFn = gapStart => gapStart + gapLength > endIndex ? endIndex : gapStart + gapLength;
    return gapsStarts.map(gapStart => ({left: gapStart, right: gapEndsFn(gapStart)}));
}

const findPageChains = (recordsIndex, pageScanResults, fileLogger, recursiveGuardCount) => {
    const { records = {}, overlapRecordIds = {} } = recordsIndex;
    fileLogger(`XXXXXXXXXXXXX_4.1.1_overlapRecordIds_r${recursiveGuardCount}.json`, JSON.stringify(overlapRecordIds, null, 4));

    const overlapRecords = Object.keys(overlapRecordIds).map(id => Object.assign({id}, records[id]));
    fileLogger(`XXXXXXXXXXXXX_4.1.2_overlapRecords_r${recursiveGuardCount}.json`, JSON.stringify(overlapRecords, null, 4));

    // /**
    //  * {
    //  *     [pageIndex]: {
    //  *         [recordIndex]: {
    //  *             [pageIndexXX]: recordIndexInXX,
    //  *             [pageIndexYY]: recordIndexInYY,
    //  *         },
    //  *         [recordIndex2]: {
    //  *             [pageIndex2XX]: recordIndex2InXX,
    //  *             [pageIndex2YY]: recordIndex2InYY,
    //  *         },
    //  *     }
    //  * }
    //  */
    // const pageOverlapsWithRecordsIndexes = getPageOverlapsWithRecordsIndexes(overlapRecords);
    /**
     * {
     *     [pageIndex]: {
     *         [pageIndexXX]: true,
     *         [pageIndexYY]: true,
     *         [pageIndex2XX]: true,
     *         [pageIndex4]: true,
     *     },
     *     [pageIndex4]: {
     *         [pageIndex8]: true,
     *     },
     *     [pageIndex8]: {
     *         [pageIndex9]: true,
     *     },
     * }
     */
    const pageOverlaps = getPageOverlaps(overlapRecords);

    fileLogger(`XXXXXXXXXXXXX_4.1.3_pageOverlaps_r${recursiveGuardCount}.json`, JSON.stringify(pageOverlaps, null, 4));

    let scannedPageIndexes = pageScanResults.map(({pageIndex} = {}) => pageIndex);
    fileLogger(`XXXXXXXXXXXXX_4.1.4_scannedPageIndexes_r${recursiveGuardCount}.json`, JSON.stringify(scannedPageIndexes, null, 4));

    /**
     * {[
     *   {
     *      [pageIndex1]:true,
     *      [pageIndex2]:true,
     *      [pageIndex3]:true,
     *      ...
     *   },
     *    ...
     * ]}
     */
     let chainsOfPageIndexes = fetchChainedOverlaps(scannedPageIndexes, pageOverlaps);
    fileLogger(`XXXXXXXXXXXXX_4.1.4_chainsOfPageIndexes_r${recursiveGuardCount}.json`, JSON.stringify(chainsOfPageIndexes, null, 4));

    /**
     *
     * [
     *  {
     *     truePageIndexesOrder, // []
     *     pageIndexes,     // {}
     *
     *     firstRecordId,
     *     lastRecordId,
     *     firstRecordName,
     *     lastRecordName,
     *
     *     trueRecordsIds,
     *     insertedRecordsIds,
     *
     *     trueRecordsOnChainCount,
     *     insertedRecordsOnChainCount,
     *     allRecordsOnChainCount,
     * },
     * ...
     * ];
     */
    const fullySortedChains = findBorderRecordsAndSortChains(
      recordsIndex, chainsOfPageIndexes, pageScanResults, scannedPageIndexes);

    return fullySortedChains;
};

function mergeGaps (gapPositions) {
    const mergedGapPositions = gapPositions.reduce(
      (acc, gap, index) => {
          const prevGap = index === 0 ? {left: 0, right: 0} : acc[acc.length - 1];
          if (prevGap.right >= gap.left) {
              acc[acc.length - 1] = {left: prevGap.left, right: gap.right};
          } else {
              acc.push(gap);
          }
          return acc;
      }, []);
    return mergedGapPositions;
}

function coverMergedGapPositionsWithPageIds(mergedGapPositions, recordsPerPage) {

    const positionToPageId = (position) => 1 + Math.floor(position / recordsPerPage);
    const pageIdsSet = mergedGapPositions.reduce((acc, {left, right}, index) => {
        const leftPageId = positionToPageId(left);
        console.log("[coverMergedGapPositionsWithPageIds]const leftPageId = positionToPageId(left); leftPageId === ", typeof leftPageId, leftPageId);
        const rightPageId = positionToPageId(right);
        console.log("[coverMergedGapPositionsWithPageIds]const rightPageId = positionToPageId(left); rightPageId === ", typeof rightPageId, rightPageId);
        acc[leftPageId] = true;
        if (rightPageId < leftPageId) {
            console.error("Error: algorithm got missed ranges");
            // return [];
            throw "Algorithm error";
        }
        for (let pageId = leftPageId + 1; pageId <= rightPageId; pageId++) {
            acc[leftPageId] = true;
        }
        return acc;
    }, {});

    console.log("[coverMergedGapPositionsWithPageIds]const pageIdsList = Object.keys(pageIdsSet).sort(); pageIdsSet === ", pageIdsSet);

    const pageIdsList = Object.keys(pageIdsSet)
      .map(pageIdString => parseInt(pageIdString, 10))
      .sort((a, b) => a - b);

    console.log("return pageIdsList; pageIdsList === ", pageIdsList);
    return pageIdsList;
}

function calcTrueAndInsertedAndMaxKnowTotalRecordsCount (pageScanResults) {
    return pageScanResults.reduce(
      (acc,
       {trueUniqRecordsOnPageCount, insertedUniqRecordsOnPageCount, pageTotalRecordsCount}) => {
          let psr = {trueUniqRecordsOnPageCount, insertedUniqRecordsOnPageCount, pageTotalRecordsCount};
          // fileLogger(`XXXXXXXXXXXXX_2.3_mutableRecordsIndex_r${recursiveGuardCount}.json`, JSON.stringify(mutableRecordsIndex, null, 4));

          acc.trueRecordsFoundCount += trueUniqRecordsOnPageCount;
          acc.insertedRecordsFoundCount += insertedUniqRecordsOnPageCount;
          acc.maxKnownTotalRecordCount = acc.maxKnownTotalRecordCount > pageTotalRecordsCount ?
            acc.maxKnownTotalRecordCount : pageTotalRecordsCount;
          return acc;
      },
      {trueRecordsFoundCount: 0, insertedRecordsFoundCount: 0, maxKnownTotalRecordCount: 0}
    );
}

async function fetchTailPages (
  maxKnownTotal,
  trueRecordsCount,
  recordsPerPage,
  tailPagesResponses,
  pageIdListFetchFn,
  fileLogger,
  fileReadDump,
  recursiveGuardCount
) {
    const tailPagesIds = calcTailPageIds(maxKnownTotal, trueRecordsCount, recordsPerPage);
    console.log(`_r${recursiveGuardCount}` + 'const tailPagesIds = calcTailPageIds(maxKnownTotal, trueRecordsCount, recordsPerPage); tailPagesIds === ', tailPagesIds);

    if (IS_DEBUG_FROM_DUMP) {
        tailPagesResponses = JSON.parse(fileReadDump(`tailPagesResponses_r${recursiveGuardCount}.json`));
    } else {
        tailPagesResponses = await pageIdListFetchFn(tailPagesIds);
        fileLogger(`tailPagesResponses_r${recursiveGuardCount}.json`, JSON.stringify(tailPagesResponses, null, 4));
    }
    return tailPagesResponses;
}

/**
 * This function finds all uniq original records, and try's to fetch all missed records
 *
 * If records are inserted to fast than we have can't reliably fetch all records for past period
 * PS: too fast means more than 15+ records per each new response for page request.
 * (15 is page size for tested period, this number also could be changed)
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
 * @NOTE: 3.1: we have an "id" field, it's uniq but we have no guarantee that it's autoincrement
 * so after records with id's 23, 24, 25, 26 we can receive any other id
 * even 1, if it was not received before
 * So we can't rely on "id" autoincrement to observe missed records
 *
 * 0) Fetch tailing pages
 * 1) Find overlaps between pages
 * 2) skip "today inserted records"
 * 3) count "true original records"
 * 4) if originalTotal < sum of all "true original records"
 *      5) fetch page without overlap, they "can" contain missed "original records"
 *      6) repeat 5) until count of found "true original records" is equal to "originalTotal"
 *
 *
 * @param firstPageResponse
 * @param otherPagesResponses
 * @param pageIdListFetchFn
 * @param isStringDatePastFn
 * @param recordsPerPage
 * @param mutableRecordsIndex {{
            trueRecordsCount: number,
            trueRecordsFoundCount: number,
            insertedRecordsFoundCount: number,
            maxKnownTotalRecordCount: number,
            isTailCaught: boolean,
            recordsPerPage: number,
            pageOverlaps: {},
            records: {},
            overlapRecordIds: {},
        } | undefined}
 * @param fileLogger
 * @param fileReadDump
 * @param recursiveGuardCount
 * @returns {Promise<*[]|*>}
 */
async function fetchMissedRecords (
    firstPageResponse,
    otherPagesResponses,
    pageIdListFetchFn,
    isStringDatePastFn,
    recordsPerPage,
    mutableRecordsIndex,
    fileLogger,
    fileReadDump,
    recursiveGuardCount = 0
) {

    console.log(">>>>>>>>>>>>> fetchMissedRecords fetchMissedRecords === ", recursiveGuardCount);
    fileLogger(`ZZZ_1_firstPageResponse_r${recursiveGuardCount}.json`, JSON.stringify(firstPageResponse, null, 4));
    fileLogger(`ZZZ_2_otherPagesResponses_r${recursiveGuardCount}.json`, JSON.stringify(otherPagesResponses, null, 4));
    fileLogger(`ZZZ_3_mutableRecordsIndex_r${recursiveGuardCount}.json`, JSON.stringify(mutableRecordsIndex, null, 4));
    fileLogger(`ZZZ_4_recordsPerPage_r${recursiveGuardCount}.json`, JSON.stringify(recordsPerPage, null, 4));
    fileLogger(`ZZZ_5_recursiveGuardCount_r${recursiveGuardCount}.json`, JSON.stringify(recursiveGuardCount, null, 4));

    if (recursiveGuardCount >= MAX_RECURSIVE_SEARCH_CYCLES) {
        console.error('##############################################################################');
        console.error(`Max recursion [${MAX_RECURSIVE_SEARCH_CYCLES}]for fetchMissedRecords reached, stopping to fetch missed records`);
        console.error('##############################################################################');
        fileLogger(`recursiveGuardCount`, recursiveGuardCount);
        return [];
    }
    // sleep 2000 seconds
    // await new Promise(r => setTimeout(r, 2000));

    // trueRecords === records we should receive for fetching all pages if no new records would be inserted
    // trueRecordsCount === firstPageResponseTotal
    // So trueRecords === records with date < momentOfFirstPageFetch.
    // it's verified by function isStringDatePastFn
    const { /*success, page,*/ value: firstPageValue } = firstPageResponse;
    const { total: firstPageTotal = 0/*, data: firstPageRecords = []*/ } = firstPageValue;
    const trueRecordsCount = firstPageTotal;

    const maxKnownTotal = getMaxTotal(otherPagesResponses);

    /**
     * Global record index.
     * @Note: pageIndex !== pageId
     *
     * @type {{
     *     [recordId]: {
     *         pageIndexes: {
     *             [pageIndex]: true
     *         },
     *         isInsertedRecord: @boolean
     *     }
     * }}
     */
    if (mutableRecordsIndex === undefined) {
        mutableRecordsIndex = {
            trueRecordsCount,
            trueRecordsFoundCount: 0,
            insertedRecordsFoundCount: 0,
            maxKnownTotalRecordCount: trueRecordsCount,
            isTailCaught: false,
            recordsPerPage,
            pageOverlaps: {},
            records: {},
            overlapRecordIds: {},
        };
    }
    fileLogger(`ZZZ_6_mutableRecordsIndex_r${recursiveGuardCount}.json`, JSON.stringify(mutableRecordsIndex, null, 4));
    fileLogger(`XXXXXXXXXXXXX_1_mutableRecordsIndex_r${recursiveGuardCount}.json`, JSON.stringify(mutableRecordsIndex, null, 4));


    let tailPagesResponses = [];
    let missedPageResponses = [];
    if (mutableRecordsIndex.isTailCaught === false) {
        tailPagesResponses = await fetchTailPages(
          maxKnownTotal,
          trueRecordsCount,
          recordsPerPage,
          tailPagesResponses,
          pageIdListFetchFn,
          fileLogger,
          fileReadDump,
          recursiveGuardCount);
    }

    //@WARNING pageResponses order is important
    let pagesResponses = [firstPageResponse, ...otherPagesResponses, ...tailPagesResponses];

    fileLogger(`XXXXXXXXXXXXX_1.1_firstPageResponse_r${recursiveGuardCount}.json`, JSON.stringify(firstPageResponse, null, 4));
    fileLogger(`XXXXXXXXXXXXX_1.2_otherPagesResponses_r${recursiveGuardCount}.json`, JSON.stringify(otherPagesResponses, null, 4));
    fileLogger(`XXXXXXXXXXXXX_1.3_tailPagesResponses_r${recursiveGuardCount}.json`, JSON.stringify(tailPagesResponses, null, 4));
    fileLogger(`XXXXXXXXXXXXX_1.4_pagesResponses_r${recursiveGuardCount}.json`, JSON.stringify(pagesResponses, null, 4));

    /**
     *
     *  [
     *    {
     *        pageIndex,                       // @number
     *        pageId,                          // id
     *        pageTotalRecordsCount,           // @number
     *        isCutTailPage,                   // @boolean
     *        isFullTailPage,                  // @boolean
     *        isTailPage,                      // @boolean
     *
     *        shiftWithInserted,               // @number
     *        shiftWithoutInserted,            // @number
     *
     *        trueRecordsIds,                  // {[id]:true, ...}
     *        trueRecordsIdList,               //  // [id]
     *        insertedRecordsIds,              // {[id]:true, ...}
     *        allRecordsIdList,                // [id, ...]
     *        trueRecordsOnPageCount,          // @number
     *        trueUniqRecordsOnPageCount,      // @number
     *        insertedRecordsOnPageCount,      // @number
     *        insertedUniqRecordsOnPageCount   // @number
     *
     *        leftMinTrueIndex,                // @number
     *        leftMaxTrueIndex,                // @number
     *        rightMinTrueIndex,               // @number
     *        rightMaxTrueIndex,               // @number
     *    },
     *    //...
     *  ]
     */
    let pageScanResults = pagesResponses.map(
        (pageResponse, pageIndex) =>
            scanPageResponse(mutableRecordsIndex, pageIndex, pageResponse, isStringDatePastFn, fileLogger, recursiveGuardCount)
    );

    fileLogger(`XXXXXXXXXXXXX_2.2_pageScanResults_r${recursiveGuardCount}.json`, JSON.stringify(pageScanResults, null, 4));
    fileLogger(`XXXXXXXXXXXXX_2.3_mutableRecordsIndex_r${recursiveGuardCount}.json`, JSON.stringify(mutableRecordsIndex, null, 4));

    // console.log('pageScanResults', JSON.stringify(pageScanResults, null, 4));
    const {
        trueRecordsFoundCount: iterationTrueRecordsFoundCount,
        insertedRecordsFoundCount: iterationInsertedRecordsFoundCount,
        maxKnownTotalRecordCount: iterationMaxKnownTotalRecordCount
    } = calcTrueAndInsertedAndMaxKnowTotalRecordsCount(pageScanResults, fileLogger, recursiveGuardCount);

    let XXXXXXXXXXXXXX = {
        iterationTrueRecordsFoundCount,
        iterationInsertedRecordsFoundCount,
        iterationMaxKnownTotalRecordCount
    };
    console.log(`XXXXXXXXXXXXX_r${recursiveGuardCount}`, XXXXXXXXXXXXXX);
    fileLogger(`XXXXXXXXXXXXX_r${recursiveGuardCount}.json`, JSON.stringify(XXXXXXXXXXXXXX, null, 4));


    mutableRecordsIndex.trueRecordsFoundCount += iterationTrueRecordsFoundCount;
    mutableRecordsIndex.insertedRecordsFoundCount += iterationInsertedRecordsFoundCount;
    mutableRecordsIndex.maxKnownTotalRecordCount = iterationMaxKnownTotalRecordCount;
    mutableRecordsIndex.isTailCaught = pageScanResults.some(scan => scan.isTailPage);

    if (mutableRecordsIndex.trueRecordsFoundCount > trueRecordsCount) {
        console.error('DATA BUG DATA BUG DATA BUG')
    }
    // If server data is malformed then on re-fetch we can get more "trueOriginal" records
    // than correct data count should be
    if (trueRecordsCount > mutableRecordsIndex.trueRecordsFoundCount) {
        //START RECURSION
        const missedRecordsCount = trueRecordsCount - mutableRecordsIndex.trueRecordsFoundCount;
        console.log(`Found [${missedRecordsCount}] missed records. Trying to fetch ...`);


        fileLogger(`XXXXXXXXXXXXX_3_mutableRecordsIndex_r${recursiveGuardCount}.json`, JSON.stringify(mutableRecordsIndex, null, 4));

        if (mutableRecordsIndex.isTailCaught === true) {
            console.log("if (mutableRecordsIndex.isTailCaught === true) {>>> recursiveTailAndMissedRecords = fetchMissedRecords");

            const fullySortedChains = findPageChains(mutableRecordsIndex, pageScanResults, fileLogger, recursiveGuardCount);
            console.log("const fullySortedChains = findPageChains(mutableRecordsIndex, pageScanResults); fullySortedChains === ", fullySortedChains);
            fileLogger(`XXXXXXXXXXXXX_4.2_fullySortedChains_r${recursiveGuardCount}.json`, JSON.stringify(fullySortedChains, null, 4));

            let scannedPageIndexes = pageScanResults.map(({pageIndex} = {}) => pageIndex);

            /**
             * Gap left and right
             * @NOTE: gaps can overlap
             *
             * @type {{left: *, right: *}[]}
             */
            const gapPositions = calcMissedRecordsPossiblePositions(mutableRecordsIndex, scannedPageIndexes, fullySortedChains, fileLogger, recursiveGuardCount);
            console.log("const gapPositions = calcMissedRecordsPossiblePositions(mutableRecordsIndex, scannedPageIndexes, fullySortedChains); gapPositions === ", gapPositions);
            fileLogger(`XXXXXXXXXXXXX_5.9_gapPositions_r${recursiveGuardCount}.json`, JSON.stringify(gapPositions, null, 4));

            const mergedGapPositions = mergeGaps(gapPositions);
            console.log("const mergedGapPositions = mergeGaps(gapPositions); mergedGapPositions === ", mergedGapPositions);
            fileLogger(`XXXXXXXXXXXXX_6_mergedGapPositions_r${recursiveGuardCount}.json`, JSON.stringify(mergedGapPositions, null, 4));

            const pageIdsToFetch = coverMergedGapPositionsWithPageIds(mergedGapPositions, recordsPerPage);
            console.log("const pageIdsToFetch = coverMergedGapPositionsWithPageIds(mergedGapPositions, recordsPerPage); pageIdsToFetch === ", pageIdsToFetch);
            fileLogger(`XXXXXXXXXXXXX_7_pageIdsToFetch_r${recursiveGuardCount}.json`, JSON.stringify(pageIdsToFetch, null, 4));

            console.log(`Calculated ${pageIdsToFetch.length} in total possible pages with missed records.`);

            console.log(`Page Ids list is : [${pageIdsToFetch.join(',')}].`);

            // const missedPageResponses = await pageIdListFetchFn(pageIdsToFetch);

            if (IS_DEBUG_FROM_DUMP) {
                missedPageResponses = JSON.parse(fileReadDump(`missedPageResponses_r${recursiveGuardCount}.json`));
            } else {
                missedPageResponses = await pageIdListFetchFn(pageIdsToFetch);
                console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
                console.log("missedPageResponses = await pageIdListFetchFn(pageIdsToFetch); missedPageResponses === ", missedPageResponses);
                console.log("missedPageResponses = await pageIdListFetchFn(pageIdsToFetch); missedPageResponses === JSON.stringify(", JSON.stringify(missedPageResponses, null, 4));
                fileLogger(`missedPageResponses_r${recursiveGuardCount}.json`, JSON.stringify(missedPageResponses, null, 4));
            }

        // console.error('missedPageResponses a1 JSON STRINGIFY', JSON.stringify(missedPageResponses, null, 4) );
        // console.error('missedPageResponses a1', (missedPageResponses) );
        }

        fileLogger(`ZZZZZ_1_otherPagesResponses_r${recursiveGuardCount}.json`, JSON.stringify(otherPagesResponses, null, 4));
        fileLogger(`ZZZZZ_2_tailPagesResponses_r${recursiveGuardCount}.json`, JSON.stringify(tailPagesResponses, null, 4));
        fileLogger(`ZZZZZ_3_missedPageResponses_r${recursiveGuardCount}.json`, JSON.stringify(missedPageResponses, null, 4));

        //@NOTE: RECURSION!
        let recursivelyFetchedRecords = await fetchMissedRecords(
          firstPageResponse,
          //@WARNING pageResponses order is important
          [...otherPagesResponses, ...tailPagesResponses, ...missedPageResponses],
          pageIdListFetchFn,
          isStringDatePastFn,
          recordsPerPage,
          mutableRecordsIndex,
          fileLogger,
          fileReadDump,
          recursiveGuardCount + 1,
        );
        return [...tailPagesResponses, ...missedPageResponses, ...recursivelyFetchedRecords];
    }

    fileLogger(`recursiveGuardCount`, recursiveGuardCount);

    // EXIT RECURSION
    //@WARNING pageResponses order is important
    return [...tailPagesResponses, ...missedPageResponses];
}

const isTotalChanged = (firstPageTotal, pageResponses) => {
    return pageResponses.some(({value: { total } = {} }) => total !== firstPageTotal);
};

const getMaxTotal = pageResponses => {
    return pageResponses.reduce(
        (acc, {value: { total } = {} }) =>
            acc > total ? acc : total,
        0);
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
 * @param isPastDayFn = () => {}
 * @return {{}}
 */
const calcVisits = (pageResponses, isPastDayFn) => {
    console.log('###################### responses ######################');
    console.log(pageResponses.length);
    // console.log(JSON.stringify(pageResponses, null, 4));
    console.log('###################### responses ######################');
    let nameVisits = {};
    const setNameVisit = (name) => nameVisits[name] = nameVisits[name] === undefined ? 1: nameVisits[name] + 1;

    let viewedRecordIds = {};
    const isIdUsed = (id) => viewedRecordIds[id] === true;
    const setIdUsed = (id) => viewedRecordIds[id] = true;


    pageResponses.filter(({success}) => success)
        .forEach(({ value: { data = [] } = {} } = {}) =>
            data.filter(({ id }) => {
                // console.log('id === ', id);
                return !isIdUsed(id)
            })
                .forEach(({ id, name, date: stringDate }) => {
                    // console.log('{ id, name, date: stringDate }', { id, name, stringDate });
                    setIdUsed(id);
                    let date = new Date(Date.parse(stringDate));
                    if (isWeekDay(date) && isPastDayFn(date)) {

                        // console.log('setNameVisit(name); [' + id + ']', name);
                        setNameVisit(name);
                    }
                })
        );

    console.log('nameVisits', nameVisits);

    const namesSorted = Object.keys(nameVisits).sort();

    console.log('namesSorted', namesSorted);
    const sortedVisits = namesSorted.map(
        name => ({
            name,
            count: nameVisits[name]
        })
    );
    return sortedVisits;
};

const validateResults = (fileReadDump, fileLogger, isPastDayFn, total) => {

    let validateFirstPageResponse = JSON.parse(fileReadDump('firstPageResponse.json'));
    let validateUnreadPagesResponses = JSON.parse(fileReadDump('unreadPagesResponses.json'));

    let maxRecursiveGuardCount = parseInt(fileReadDump('recursiveGuardCount'), 10);
    console.log("maxRecursiveGuardCount === ", maxRecursiveGuardCount);

    if (isNaN(maxRecursiveGuardCount)) {
        maxRecursiveGuardCount = -1;
    }
    console.log("VALID maxRecursiveGuardCount === ", maxRecursiveGuardCount);

    let possibleRecursiveIndexes = [];
    for (let i = maxRecursiveGuardCount; i >= 0; i--) {
        possibleRecursiveIndexes.push(i);
    }
    console.log("let possibleRecursiveIndexes = []; possibleRecursiveIndexes === ", possibleRecursiveIndexes);

    const tailPagesFilenameFn = (recursionIndex) => `tailPagesResponses_r${recursionIndex}.json`;
    const missedPagesFilenameFn = (recursionIndex) => `missedPageResponses_r${recursionIndex}.json`;

    const recursiveValidateTailPagesResponses = possibleRecursiveIndexes.map(index =>
      fileReadDump(tailPagesFilenameFn(index))).filter(fileContent => fileContent !== undefined);
    const recursiveValidateMissedPagesResponses = possibleRecursiveIndexes.map(index =>
      fileReadDump(missedPagesFilenameFn(index))).filter(fileContent => fileContent !== undefined);

    fileLogger('xx_recursiveValidateTailPagesResponses.json', JSON.stringify(recursiveValidateTailPagesResponses, null, 4));
    fileLogger('xx_recursiveValidateMissedPagesResponses.json', JSON.stringify(recursiveValidateMissedPagesResponses, null, 4));

    let validateTailPagesResponses = recursiveValidateTailPagesResponses.map(JSON.parse).flat();
    let validateMissedPageResponses = recursiveValidateMissedPagesResponses.map(JSON.parse).flat();

    fileLogger('x_validateFirstPageResponse.json',  JSON.stringify(validateFirstPageResponse, null, 4));
    fileLogger('x_validateUnreadPagesResponses.json',  JSON.stringify(validateUnreadPagesResponses, null, 4));
    fileLogger('x_validateTailPagesResponses.json',  JSON.stringify(validateTailPagesResponses, null, 4));
    fileLogger('x_validateMissedPageResponses.json',  JSON.stringify(validateMissedPageResponses, null, 4));

    let all = [
        validateFirstPageResponse,
        ...validateUnreadPagesResponses,
        ...validateTailPagesResponses,
        ...validateMissedPageResponses,
    ];
    fileLogger('validate_1_allResponses.json',  JSON.stringify(all, null, 4));
    let allRecsWithDuplicates = (all.map(i => i.value.data)).flat().sort((a, b) => a.id - b.id);
    fileLogger('validate_2_allRecordsWithDubs.json', JSON.stringify(allRecsWithDuplicates, null, 4));
    let allRecsSet = {};
    allRecsWithDuplicates.forEach(rec => allRecsSet[rec.id] = rec);
    Object.keys(allRecsSet).forEach(id =>
    {
        allRecsSet[id].isPast = isPastDayFn(new Date(allRecsSet[id].date));
        allRecsSet[id].isWeekDay = isWeekDay(new Date(allRecsSet[id].date));
    });
    fileLogger('validate_3_allRecsSet.json', JSON.stringify(allRecsSet, null, 4));

    let correctPastRecsIds = Object.keys(allRecsSet).filter(id => allRecsSet[id].isPast);
    fileLogger('validate_4.0_correctPastRecsIds.json', JSON.stringify(correctPastRecsIds, null, 4));
    fileLogger('validate_4.0_correctPastRecsIds_length_' + correctPastRecsIds.length,
      correctPastRecsIds.length);

    //implicit check for id < firstPageTotalCount
    let correctLessThanTotalIds = Object.keys(allRecsSet).filter(id => id < total);
    fileLogger('validate_4.1_correctLessThanTotalIds.json', JSON.stringify(correctLessThanTotalIds, null, 4));
    fileLogger('validate_4.1_correctLessThanTotalIds_length_' + correctLessThanTotalIds.length,
      correctLessThanTotalIds.length);

    let correctRecsIds = Object.keys(allRecsSet).filter(id => allRecsSet[id].isPast && allRecsSet[id].isWeekDay);

    let correctRecsSet = {};
    correctRecsIds.forEach(id => correctRecsSet[id] = allRecsSet[id]);
    fileLogger('validate_4_correctRecsSet.json', JSON.stringify(correctRecsSet, null, 4));

    let correctRecsList = correctRecsIds.map(id => correctRecsSet[id]);
    fileLogger('validate_5_correctRecsList.json', JSON.stringify(correctRecsList, null, 4));
    fileLogger('validate_6_correctRecsList_length_' + correctRecsList.length, correctRecsList.length);

    let countedRecSet = {};
    correctRecsList.forEach(rec => {
        if (countedRecSet[rec.name] === undefined) {
            countedRecSet[rec.name] = Object.assign({count: 1}, rec);
        } else {
            countedRecSet[rec.name].count++;
        }
    });
    fileLogger('validate_7_countedRecSet.json', JSON.stringify(countedRecSet, null, 4));

    let countedRecList = Object.keys(countedRecSet).map(name => countedRecSet[name]);
    fileLogger('validate_8_countedRecList.json', JSON.stringify(countedRecList, null, 4));

    let countedRecShortList = countedRecList.map(rec => ({name: rec.name, count:rec.count}));
    fileLogger('validate_9_countedRecShortList.json', JSON.stringify(countedRecShortList, null, 4));
};

const listUsers = async () => {

    try {

        // console.error('a1');
        const token = await fetchTokenFn();
        if (token === false) {
            console.error('Error: Auth request failed');
            return;
        }

        let startMoment = new Date();

        const dumpFilePathPrefixTemplate = (date) => {
            const dateTimeStr = date.getFullYear() + '_' + (date.getMonth() + 1) + '_' + date.getDate() +
              '__' + date.getHours() + '.' + date.getMinutes() + '.' + date.getSeconds();
            return 'log_' + dateTimeStr + '_';
        };


        const fileReadDump = (label) => {
            console.log("[fileReadDump] [checking] file: '" + label + "'");
            const prefix = IS_DEBUG_FROM_DUMP ?
              DUMP_FILE_PATH :
              dumpFilePathPrefixTemplate(startMoment);

            const filePath = 'logs/' + prefix + label;
            let isFileExists = fs.existsSync(filePath);
            if (isFileExists) {
                console.log("[fileReadDump] [loaded__] file: '" + label + "'");
                return fs.readFileSync(filePath, 'utf8');
            } else {
                console.log("[fileReadDump] [skipped_] file: '" + label + "'");
                return undefined;
            }
        };

        if (IS_DEBUG_FROM_DUMP) {
            startMoment = new Date(fileReadDump('startMoment'));
        }

        const fileLogger = (label, data) => {
            if (!IS_LOG_RESPONSES) {
                return;
            }
            const fileName = dumpFilePathPrefixTemplate(startMoment) + label;

            //Store log uniq prefix to bootstrap debugFromDump using it in DUMP_FILE_PATH
            if (data === undefined && label === '_BOOTSTRAP') {
                data = dumpFilePathPrefixTemplate(startMoment);
            }

            fs.writeFileSync('logs/' + fileName, data);
        };

        if (!IS_DEBUG_FROM_DUMP) {
            fileLogger('_BOOTSTRAP', undefined);
            fileLogger('startMoment', startMoment);
        }

        console.log('startMoment', startMoment);
        const startMomentUTCMilliseconds = startMoment.getTime();
        const startMomentUTCStartOfDateMilliseconds = getUTCStartOfDateMilliseconds(startMoment);
        const isPastDayFn = (date) => getUTCStartOfDateMilliseconds(date) < startMomentUTCStartOfDateMilliseconds;
        const isStringDatePastFn = (date) => startMomentUTCMilliseconds > Date.parse(date);
        const pageFetcherFn = fetchUsersPageFnFactory(token);

        const pageIdListFetchFn = pageIdListFetchFnFactory(pageFetcherFn);

        // const firstPageResponse = await pageFetcherFn(1);

        let firstPageResponse;
        if (IS_DEBUG_FROM_DUMP) {
            firstPageResponse = JSON.parse(fileReadDump('firstPageResponse.json'));
        } else {
            firstPageResponse = await pageFetcherFn(1);
            fileLogger('firstPageResponse.json', JSON.stringify(firstPageResponse, null, 4));
        }

        const { success, page, value: firstPageValue } = firstPageResponse;
        if (success === false) {
            console.error('Error: First Page request failed');
            return;
        }
        const { total = 0, data: firstPageRecords = [] } = firstPageValue;

        // console.log('firstPageRecords', firstPageRecords);
        const firstPageRecordsCount = firstPageRecords.length;
        console.log('firstPageRecordsCount ', firstPageRecordsCount );
        console.log('typeof firstPageRecordsCount ', typeof firstPageRecordsCount );
        console.log('total', total);
        const {
            recordsPerPage,
            originalPagesCount,
            pageIds: unreadPageIds,
        } = calcPageIdsAfterFirstPage(total, firstPageRecordsCount);
        
        console.log('unreadPageIds', unreadPageIds);

        // const unreadPagesResponses = await pageIdListFetchFn(unreadPageIds);

        let unreadPagesResponses;
        if (IS_DEBUG_FROM_DUMP) {
            unreadPagesResponses = JSON.parse(fileReadDump('unreadPagesResponses.json'));
        } else {
            unreadPagesResponses = await pageIdListFetchFn(unreadPageIds);
            fileLogger('unreadPagesResponses.json', JSON.stringify(unreadPagesResponses, null, 4));
        }

        // console.error('firstPageResponse a1 JSON STRINGIFY', JSON.stringify(firstPageResponse, null, 4) );
        // console.error('firstPageResponse a1', (firstPageResponse) );
        // console.error('unreadPagesResponses a1 JSON STRINGIFY', JSON.stringify(unreadPagesResponses, null, 4) );
        // console.error('unreadPagesResponses a1', (unreadPagesResponses) );

        let endMoment = new Date();

        let currentDateIsoString = startMoment.toISOString();

        console.log('currentDateIsoString', currentDateIsoString);

        const isDataChanged = isTotalChanged(total, unreadPagesResponses);
        console.log('isDataChanged', isDataChanged);

        // let finalDataSet = [firstPageResponse, ...unreadPagesResponses];

        let pagesWithMissedRecordsResponses = [];
        if (isDataChanged) {
            // fetch missed records if any
            pagesWithMissedRecordsResponses = await fetchMissedRecords(
                firstPageResponse,
                unreadPagesResponses,
                pageIdListFetchFn,
                isStringDatePastFn,
                recordsPerPage,
                undefined,
                fileLogger,
                fileReadDump,
            );
        }

        const visits = calcVisits(
            [firstPageResponse, ...unreadPagesResponses, ...pagesWithMissedRecordsResponses],
            isPastDayFn);

        console.log('visits', visits);
        console.log(JSON.stringify(visits, null, 4));

        if (!IS_DEBUG_FROM_DUMP) {
            fileLogger('isDataChanged', JSON.stringify(isDataChanged, null, 4));
            fileLogger(
              (
                'visits_' + visits.length + '_of_[' + total + ']_' +
                (isDataChanged ? 'dataIsNONStatic' : 'dataIsStatic' ) +
                '.json'
              ),
              JSON.stringify(visits, null, 4));
        }
        console.log('isDataChanged', isDataChanged);


        try {
            validateResults(fileReadDump, fileLogger, isPastDayFn, total);
        } catch (e) {
            console.error('VALIDATION FAILED', e);
        }
    } catch (err) {
        console.error('General error:', err);
    }

};

listUsers();
