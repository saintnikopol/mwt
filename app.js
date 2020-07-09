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

const DUMP_FILE_PATH = 'log_2020_7_9__16.54.27_';

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

    try {
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
         console.log("for (let tailPageId = firstUnfetchedPageId; firstUnfetchedPageId <= maxKnownTotalPageId; tailPageId++) { tailPageId === ", tailPageId);
        tailPageIds.push(tailPageId)
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

const scanPageResponse = (mutableRecordsIndex, pageIndex, pageResponse, isStringDatePastFn) => {

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
        } else {
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

/**
 *
 * @param overlapRecords
 * @returns {{
    [pageIndex]: {
        [recordIndex]: {
            [pageIndexXX]: 'recordIndexInXX',
            [pageIndexYY]: 'recordIndexInYY',
        },
        [recordIndex2]: {
            [pageIndex2XX]: 'recordIndex2InXX',
            [pageIndex2YY]: 'recordIndex2InYY',
        },
    }
}}
 */
function getPageOverlapsWithRecordsIndexes(overlapRecords) {
    return overlapRecords.reduce((accPageOverlapsWith, overlapRecord) => {
            const {pageIndexes, isInsertedRecord} = overlapRecord;
            const overlappedPageIndexes = Object.keys(pageIndexes);
            overlappedPageIndexes.forEach(pageIndex => {
                const recordIndex = pageIndexes[pageIndex];
                if (accPageOverlapsWith[pageIndex] === undefined) {
                    accPageOverlapsWith[pageIndex] = {
                        /// [recordIndex] : { [pageIndex1]: recordIndex13, [pageIndex2]: recordIndex7}
                        [recordIndex]: {},
                    };
                } else if (accPageOverlapsWith[pageIndex][recordIndex] === undefined) {
                    accPageOverlapsWith[pageIndex][recordIndex] = {};
                }

                overlappedPageIndexes.filter(
                    overlappedPageIndex => overlappedPageIndex !== pageIndex
                ).forEach(overlappedPageIndexFiltered =>
                    accPageOverlapsWith[pageIndex][recordIndex][overlappedPageIndexFiltered] =
                        pageIndexes[overlappedPageIndexFiltered]
                );
            });
            console.log("return accPageOverlapsWith; accPageOverlapsWith === ", accPageOverlapsWith);
            return accPageOverlapsWith;
        },
        {});
}

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
    // let pageCount = pageIndexesList.length;
    // let unUsedPageCount = pageCount;
    // if (pageIndexesList.length === 1) {
    //     let {
    //         trueRecordsIds,
    //         trueRecordsIdList,
    //
    //         leftMinTrueIndex,
    //         leftMaxTrueIndex,
    //         rightMinTrueIndex,
    //         rightMaxTrueIndex,
    //         // truePageOrder: [pageIndex1, pageIndex2, pageIndex3],
    //         // pageIndexesList: {pageIndex1: true, pageIndex2: true, pageIndex3: true}
    //     } = scannedPageIndexes[pageIndexesList[0]];
    //
    //     return ({
    //         firstRecordName: pickName(trueRecordsIdList[0]),
    //         trueRecordsIds: Object.assign({}, trueRecordsIds),
    //         trueRecordsIdList: [...trueRecordsIdList],
    //
    //         leftMinTrueIndex,
    //         leftMaxTrueIndex,
    //         rightMinTrueIndex,
    //         rightMaxTrueIndex,
    //         truePageOrder: [pageIndexesList],
    //         pageIndexes: Object.assign({}, chainOfPageIndexes),
    //     });
    // }
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
 * @returns {{left: *, right: *}[]}
 */
function calcMissedRecordsPossiblePositions(recordsIndex, scannedPageIndexes, fullySortedChains ) {
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

    let xxx = {
        trueRecordsCount,
          trueRecordsFoundCount,
          insertedRecordsFoundCount,
          maxKnownTotalRecordCount,
        // recordsPerPage,
    };
    console.log('xxx', xxx);
    const stripeLengths = fullySortedChains.map(chain => chain.allRecordsOnChainCount);
    console.log("const stripeLengths = fullySortedChains.map(chain => chain.allRecordsOnChainCount); stripeLengths === ", stripeLengths);
    const gapsStarts = stripeLengths.reduce(
      (acc, stripeLength, index, stripes) => {
          if (index < stripes.length) {
              let prev = index === 0 ? 0 : acc[index - 1];
              acc.push(prev + stripeLength);
          }
          return acc;
      }, []);

    return gapsStarts.map(gapStart => ({left: gapStart, right: gapStart + gapLength}));
}

const findPageChains = (recordsIndex, pageScanResults) => {
    const { records = {}, overlapRecordIds = {} } = recordsIndex;
    const overlapRecords = Object.keys(overlapRecordIds).map(id => records[id]);
    /**
     * {
     *     [pageIndex]: {
     *         [recordIndex]: {
     *             [pageIndexXX]: recordIndexInXX,
     *             [pageIndexYY]: recordIndexInYY,
     *         },
     *         [recordIndex2]: {
     *             [pageIndex2XX]: recordIndex2InXX,
     *             [pageIndex2YY]: recordIndex2InYY,
     *         },
     *     }
     * }
     */
    const pageOverlapsWithRecordsIndexes = getPageOverlapsWithRecordsIndexes(overlapRecords);
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

    let scannedPageIndexes = pageScanResults.map(({pageIndex} = {}) => pageIndex);

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

// /**
//  * Order everything by leftMaxTrueIndex
//  *
//  * @param pageScanResults
//  * @param chains
//  * @returns {[
//  *     [{
//                 pageIndex,
//                 leftMinTrueIndex,
//                 leftMaxTrueIndex,
//                 rightMinTrueIndex,
//                 rightMaxTrueIndex,
//             }, ...],
//  *     ...
//  * ]}
//  */
// function sortChainAndPagesAndSetBoundaries(pageScanResults, chains) {
//     const SORT_PROPERTY = 'leftMaxTrueIndex';
//     let chainScanWithSortedPageIndexes = chains.map(chain => {
//         Object.keys(chain).map(pageIndex => {
//             const {
//                 leftMinTrueIndex,
//                 leftMaxTrueIndex,
//                 rightMinTrueIndex,
//                 rightMaxTrueIndex,
//             } = pageScanResults[pageIndex];
//             return {
//                 pageIndex,
//                 leftMinTrueIndex,
//                 leftMaxTrueIndex,
//                 rightMinTrueIndex,
//                 rightMaxTrueIndex,
//             };
//         }).sort((a, b) => {
//             return a[SORT_PROPERTY] - b[SORT_PROPERTY];
//         });
//
//     });
//     return chainScanWithSortedPageIndexes.sort(
//         (a, b) => a[0][SORT_PROPERTY] - b[0][SORT_PROPERTY]
//     );
// }

// function calcChainBorders(chainScan) {
//
// }

// function adjustChainsBoundaries (recordsIndex, sortedChainsScans) {
//     let isBoundaryChanged = false;
//     let rollingBorders = {};
//     let adjustedInChainsBoundaries = sortedChainsScans.forEach(sortedChainScan => {
//
//     });
//
//     return sortedChainsScans;
// }

// function getRange(recordsIndex, pageScanResults, pageChain, pageOverlapsWithRecordsIndexes) {
//
//     // const { trueRecordsCount, recordsPerPage } = recordsIndex;
//
// }

// function getRanges(recordsIndex, pageScanResults, pageIndexesChains, pageOverlapsWithRecordsIndexes) {
//     let sortedChainsScans = sortChainAndPagesAndSetBoundaries(pageScanResults, pageIndexesChains);
//     let adjustedChainsBoundaries = adjustChainsBoundaries(sortedChainsScans);
//     // let pageChainIndexesSortedByLeftMin = pageChains.map(chai)
//     return pageIndexesChains.map(pageChain =>
//         getRange(recordsIndex, pageScanResults, pageChain, pageOverlapsWithRecordsIndexes)
//     );
// }

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
        const rightPageId = positionToPageId(right);
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
    const pageIdsList = Object.keys(pageIdsSet).sort();
    return pageIdsList;
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
 * @param fileLogger
 * @param fileReadDump
 * @returns {Promise<*[]|*>}
 */
async function fetchMissedRecords (
    firstPageResponse,
    otherPagesResponses,
    pageIdListFetchFn,
    isStringDatePastFn,
    recordsPerPage,
    fileLogger,
    fileReadDump,
) {

    // trueRecords === records we should receive for fetching all pages if no new records would be inserted
    // trueRecordsCount === firstPageResponseTotal
    // So trueRecords === records with date < momentOfFirstPageFetch.
    // it's verified by function isStringDatePastFn
    const { /*success, page,*/ value: firstPageValue } = firstPageResponse;
    const { total: firstPageTotal = 0/*, data: firstPageRecords = []*/ } = firstPageValue;
    const trueRecordsCount = firstPageTotal;
    const isDataChanged = isTotalChanged(trueRecordsCount, otherPagesResponses);

    if (isDataChanged) {
        const maxKnownTotal = getMaxTotal(otherPagesResponses);
        const tailPagesIds = calcTailPageIds(maxKnownTotal, trueRecordsCount, recordsPerPage);
        console.log("const tailPagesIds = calcTailPageIds(maxKnownTotal, trueRecordsCount, recordsPerPage); tailPagesIds === ", tailPagesIds);
        // throw "TAIL";
        // const tailPagesResponses = await pageIdListFetchFn(tailPagesIds);

        let tailPagesResponses;
        if (IS_DEBUG_FROM_DUMP) {
            tailPagesResponses = JSON.parse(fileReadDump('tailPagesResponses.json'));
        } else {
            tailPagesResponses = await pageIdListFetchFn(tailPagesIds);
            fileLogger('tailPagesResponses.json', JSON.stringify(tailPagesResponses));
        }


        // console.error('tailPagesResponses a1 JSON STRINGIFY', JSON.stringify(tailPagesResponses) );
        // console.error('tailPagesResponses a1', (tailPagesResponses) );

        const isTailCaught = isTailCaughtFn(tailPagesResponses, recordsPerPage);

        console.log('isTailCaught', isTailCaught);
        let pagesResponses = [firstPageResponse, ...otherPagesResponses, ...tailPagesResponses];

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
        let mutableRecordsIndex = {
            trueRecordsCount,
            trueRecordsFoundCount: 0,
            insertedRecordsFoundCount: 0,
            maxKnownTotalRecordCount: trueRecordsCount,
            isTailCaught,
            recordsPerPage,
            pageOverlaps: {},
            records: {},
            overlapRecordIds: {},
        };

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
                scanPageResponse(mutableRecordsIndex, pageIndex, pageResponse, isStringDatePastFn)
        );
        // console.log('pageScanResults', JSON.stringify(pageScanResults));
        const {trueRecordsFoundCount, insertedRecordsFoundCount} = pageScanResults.reduce(
            (acc,
             { trueUniqRecordsOnPageCount, insertedUniqRecordsOnPageCount }) =>
            {
                acc.trueRecordsFoundCount += trueUniqRecordsOnPageCount;
                acc.insertedRecordsFoundCount += insertedUniqRecordsOnPageCount;
                return acc;
            },
            {trueRecordsFoundCount: 0, insertedRecordsFoundCount: 0}
          );

        if (trueRecordsFoundCount > trueRecordsCount) {
            console.error('DATA BUG DATA BUG DATA BUG')
        }
        // If server data is malformed then on re-fetch we can get more "trueOriginal" records 
        // than correct data count should be 
        if (trueRecordsFoundCount >= trueRecordsCount) {
            return tailPagesResponses;
        } else {

            const missedRecordsCount = trueRecordsCount - trueRecordsFoundCount;
            console.log(`Found [${missedRecordsCount}] missed records. Trying to fetch ...`);

            mutableRecordsIndex.trueRecordsFoundCount = trueRecordsFoundCount;
            mutableRecordsIndex.insertedRecordsFoundCount = insertedRecordsFoundCount;
            mutableRecordsIndex.maxKnownTotalRecordCount = pageScanResults.reduce(
                (acc, scan) =>
                    acc > scan.pageTotalRecordsCount ? acc : scan.pageTotalRecordsCount,
                mutableRecordsIndex.maxKnownTotalRecordCount
            );
            mutableRecordsIndex.isTailCaught = pageScanResults.some(scan => scan.isTailPage);

            const fullySortedChains = findPageChains(mutableRecordsIndex, pageScanResults);
            console.log("const fullySortedChains = findPageChains(mutableRecordsIndex, pageScanResults); fullySortedChains === ", fullySortedChains);

            let scannedPageIndexes = pageScanResults.map(({pageIndex} = {}) => pageIndex);

            /**
             * Gap left and right
             * @NOTE: gaps can overlap
             *
             * @type {{left: *, right: *}[]}
             */
            const gapPositions = calcMissedRecordsPossiblePositions(mutableRecordsIndex, scannedPageIndexes, fullySortedChains);
            console.log("const gapPositions = calcMissedRecordsPossiblePositions(mutableRecordsIndex, scannedPageIndexes, fullySortedChains); gapPositions === ", gapPositions);

            const mergedGapPositions = mergeGaps(gapPositions);
            console.log("const mergedGapPositions = mergeGaps(gapPositions); mergedGapPositions === ", mergedGapPositions);

            const pageIdsToFetch = coverMergedGapPositionsWithPageIds(mergedGapPositions, recordsPerPage);
            console.log("const pageIdsToFetch = coverMergedGapPositionsWithPageIds(mergedGapPositions, recordsPerPage); pageIdsToFetch === ", pageIdsToFetch);

            console.log(`Calculated ${pageIdsToFetch.length} in total possible pages with missed records.`);

            // console.log(`Page Ids list is : [${pageIdsToFetch.join(',')}].`);

            // const missedPageResponses = await pageIdListFetchFn(pageIdsToFetch);

            let missedPageResponses;
            if (IS_DEBUG_FROM_DUMP) {
                missedPageResponses = JSON.parse(fileReadDump('missedPageResponses.json'));
            } else {
                missedPageResponses = await pageIdListFetchFn(pageIdsToFetch);
                fileLogger('missedPageResponses.json', JSON.stringify(missedPageResponses));
            }

            // console.error('missedPageResponses a1 JSON STRINGIFY', JSON.stringify(missedPageResponses) );
            // console.error('missedPageResponses a1', (missedPageResponses) );

            return [...missedPageResponses, ...tailPagesResponses];
            // /**
            //  * [
            //  * {
            //  *     chainIndex,
            //  *     pageIndexes,
            //  *     leftMinTrueIndex,
            //  *     leftMaxTrueIndex,
            //  *     rightMinTrueIndex,
            //  *     rightMaxTrueIndex,
            //  *     maxGap,
            //  * }]
            //  */
            // let ranges = getRanges(recordsIndex, pageScanResults, chainsOfPageIndexes, pageOverlapsWithRecordsIndexes);

            // scanPageOverlaps(mutableRecordsIndex, pageScanResults)
        }
    }


    return [];
};

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
    // console.log(JSON.stringify(pageResponses));
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

const listUsers = async () => {

    try {

        // console.error('a1');
        const token = await fetchTokenFn();
        if (token === false) {
            console.error('Error: Auth request failed');
            return;
        }

        let startMoment = new Date();

        const fileReadDump = (label) => {
            const path = 'logs/' + DUMP_FILE_PATH + label;
            return fs.readFileSync(path);
        };

        if (IS_DEBUG_FROM_DUMP) {
            startMoment = new Date(fileReadDump('startMoment'));
        }

        const fileLogger = (label, data) => {
            if (!IS_LOG_RESPONSES) {
                return;
            }
            const sm = startMoment;
            const dateTimeStr = sm.getFullYear() + '_' + (sm.getMonth() + 1) + '_' + sm.getDate() +
              '__' + sm.getHours() + '.' + sm.getMinutes() + '.' + sm.getSeconds();
            const fileName = 'log_' + dateTimeStr + '_' + label;

            //Store log uniq prefix to bootstrap debugFromDump using it in DUMP_FILE_PATH
            if (data === undefined && label === '') {
                data = fileName;
            }

            fs.writeFile('logs/' + fileName, data, () => {});
        };

        if (!IS_DEBUG_FROM_DUMP) {
            fileLogger('', undefined);
            fileLogger('startMoment', startMoment);
        }

        console.log('startMoment', startMoment);
        const startMomentUTCStartOfDateMilliseconds = getUTCStartOfDateMilliseconds(startMoment);
        const isPastDayFn = (date) => getUTCStartOfDateMilliseconds(date) < startMomentUTCStartOfDateMilliseconds;
        const isStringDatePastFn = (date) => startMomentUTCStartOfDateMilliseconds > Date.parse(date);
        const pageFetcherFn = fetchUsersPageFnFactory(token);

        const pageIdListFetchFn = pageIdListFetchFnFactory(pageFetcherFn);

        // const firstPageResponse = await pageFetcherFn(1);

        let firstPageResponse;
        if (IS_DEBUG_FROM_DUMP) {
            firstPageResponse = JSON.parse(fileReadDump('firstPageResponse.json'));
        } else {
            firstPageResponse = await pageFetcherFn(1);
            fileLogger('firstPageResponse.json', JSON.stringify(firstPageResponse));
        }

        const { success, page, value: firstPageValue } = firstPageResponse;
        if (success === false) {
            console.error('Error: First Page request failed');
            return;
        }
        //const json = {"total":150,"data":[{"id":120,"name":"Visitor #14","date":"2020-06-20T16:08:40+00:00"},{"id":80,"name":"Visitor #14","date":"2020-06-17T05:54:38+00:00"},{"id":59,"name":"Visitor #14","date":"2020-06-23T22:55:42+00:00"},{"id":38,"name":"Visitor #14","date":"2020-06-18T14:56:55+00:00"},{"id":2,"name":"Visitor #14","date":"2020-06-22T20:14:09+00:00"},{"id":146,"name":"Visitor #15","date":"2020-06-19T08:39:16+00:00"},{"id":131,"name":"Visitor #15","date":"2020-06-23T23:13:46+00:00"},{"id":75,"name":"Visitor #15","date":"2020-06-18T17:52:27+00:00"},{"id":0,"name":"Visitor #15","date":"2020-06-11T18:19:43+00:00"},{"id":103,"name":"Visitor #16","date":"2020-06-19T19:05:08+00:00"},{"id":94,"name":"Visitor #16","date":"2020-06-21T17:02:43+00:00"},{"id":85,"name":"Visitor #16","date":"2020-06-22T03:29:56+00:00"},{"id":145,"name":"Visitor #17","date":"2020-06-25T14:07:10+00:00"},{"id":60,"name":"Visitor #17","date":"2020-06-24T00:18:28+00:00"},{"id":17,"name":"Visitor #17","date":"2020-06-22T00:34:46+00:00"}]};
        //const { total = 0, data: firstPageRecords = [] } = json;
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
            fileLogger('unreadPagesResponses.json', JSON.stringify(unreadPagesResponses));
        }

        // console.error('firstPageResponse a1 JSON STRINGIFY', JSON.stringify(firstPageResponse) );
        // console.error('firstPageResponse a1', (firstPageResponse) );
        // console.error('unreadPagesResponses a1 JSON STRINGIFY', JSON.stringify(unreadPagesResponses) );
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
                fileLogger,
                fileReadDump,
            );
        }

        const visits = calcVisits(
            [firstPageResponse, ...unreadPagesResponses, ...pagesWithMissedRecordsResponses],
            isPastDayFn);

        console.log('visits', visits);
        console.log(JSON.stringify(visits));

        if (!IS_DEBUG_FROM_DUMP) {
            fileLogger('isDataChanged', JSON.stringify(isDataChanged));
            fileLogger(
              (
                'visits_' + visits.length + '_of_[' + total + ']_' +
                (isDataChanged ? 'dataIsNONStatic' : 'dataIsStatic' ) +
                '.json'
              ),
              JSON.stringify(visits));
        }
        console.log('isDataChanged', isDataChanged);

        const validateResults = () => {
            let validateTailPagesResponses = JSON.parse(fileReadDump('tailPagesResponses.json'));
            let validateMissedPageResponses = JSON.parse(fileReadDump('missedPageResponses.json'));
            let validateFirstPageResponse = JSON.parse(fileReadDump('firstPageResponse.json'));
            let validateUnreadPagesResponses = JSON.parse(fileReadDump('unreadPagesResponses.json'));

            let all = [
              validateFirstPageResponse,
              ...validateUnreadPagesResponses,
              ...validateTailPagesResponses,
              ...validateMissedPageResponses,
            ];
            fileLogger('validate_1_allResponses.json',  JSON.stringify(all));
            let allRecsWithDuplicates = (all.map(i => i.value.data)).flat().sort((a, b) => a.id - b.id);
            fileLogger('validate_2_allRecordsWithDubs.json', JSON.stringify(allRecsWithDuplicates));
            let allRecsSet = {};
            allRecsWithDuplicates.forEach(rec => allRecsSet[rec.id] = rec);
            Object.keys(allRecsSet).forEach(id =>
            {
                allRecsSet[id].isPast = isPastDayFn(new Date(allRecsSet[id].date));
                allRecsSet[id].isWeekDay = isWeekDay(new Date(allRecsSet[id].date));
            });
            fileLogger('validate_3_allRecsSet.json', JSON.stringify(allRecsSet));

            let correctPastRecsIds = Object.keys(allRecsSet).filter(id => allRecsSet[id].isPast);
            fileLogger('validate_4.0_correctPastRecsIds.json', JSON.stringify(correctPastRecsIds));
            fileLogger('validate_4.0_correctPastRecsIds_length_' + correctPastRecsIds.length,
              correctPastRecsIds.length);

            //implicit check for id < firstPageTotalCount
            let correctLessThanTotalIds = Object.keys(allRecsSet).filter(id => id < total);
            fileLogger('validate_4.1_correctLessThanTotalIds.json', JSON.stringify(correctLessThanTotalIds));
            fileLogger('validate_4.1_correctLessThanTotalIds_length_' + correctLessThanTotalIds.length,
              correctLessThanTotalIds.length);

            let correctRecsIds = Object.keys(allRecsSet).filter(id => allRecsSet[id].isPast && allRecsSet[id].isWeekDay);

            let correctRecsSet = {};
            correctRecsIds.forEach(id => correctRecsSet[id] = allRecsSet[id]);
            fileLogger('validate_4_correctRecsSet.json', JSON.stringify(correctRecsSet));

            let correctRecsList = correctRecsIds.map(id => correctRecsSet[id]);
            fileLogger('validate_5_correctRecsList.json', JSON.stringify(correctRecsList));
            fileLogger('validate_6_correctRecsList_length_' + correctRecsList.length, correctRecsList.length);

            let countedRecSet = {};
            correctRecsList.forEach(rec => {
                if (countedRecSet[rec.name] === undefined) {
                    countedRecSet[rec.name] = Object.assign({count: 1}, countedRecSet[rec.name]);
                } else {
                    countedRecSet[rec.name].count++;
                }
            });
            fileLogger('validate_7_countedRecSet.json', JSON.stringify(correctRecsList));
        };

        validateResults();
    } catch (err) {
        console.error('General error:', err);
    }

};

listUsers();
