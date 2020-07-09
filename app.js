const rax = require('retry-axios');
const axios = require('axios');

const fs = require('fs');

const HOST_URL = 'https://motorway-challenge-api.herokuapp.com/api/login';
const LIST_URL_TEMPLATE = (pageNo, token) => `https://motorway-challenge-api.herokuapp.com/api/visits?page=${pageNo}&token=${token}`;

const RAX_CONFIG = {
    // Retry 3 times on requests that return a response (500, etc) before giving up.  Defaults to 3.
    retry: 3,
    // Retry twice on errors that don't return a response (ENOTFOUND, ETIMEDOUT, etc).
    noResponseRetries: 2,
};



const debugFirstPageResponse = {
    "success": true, "page": 1, "value": {
        "total": 150,
        "data": [{"id": 12, "name": "Visitor #0", "date": "2020-06-14T02:36:48+00:00"}, {
            "id": 93,
            "name": "Visitor #1",
            "date": "2020-06-13T13:05:34+00:00"
        }, {"id": 39, "name": "Visitor #1", "date": "2020-06-16T10:38:42+00:00"}, {
            "id": 17,
            "name": "Visitor #10",
            "date": "2020-06-15T03:22:20+00:00"
        }, {"id": 114, "name": "Visitor #11", "date": "2020-06-18T16:10:00+00:00"}, {
            "id": 109,
            "name": "Visitor #11",
            "date": "2020-06-13T18:52:38+00:00"
        }, {"id": 136, "name": "Visitor #12", "date": "2020-06-24T18:08:23+00:00"}, {
            "id": 48,
            "name": "Visitor #13",
            "date": "2020-06-21T23:08:54+00:00"
        }, {"id": 43, "name": "Visitor #13", "date": "2020-06-21T22:26:03+00:00"}, {
            "id": 55,
            "name": "Visitor #14",
            "date": "2020-06-14T16:45:18+00:00"
        }, {"id": 20, "name": "Visitor #14", "date": "2020-06-12T11:24:06+00:00"}, {
            "id": 1,
            "name": "Visitor #14",
            "date": "2020-06-20T23:37:43+00:00"
        }, {"id": 99, "name": "Visitor #15", "date": "2020-06-18T05:33:50+00:00"}, {
            "id": 86,
            "name": "Visitor #15",
            "date": "2020-06-24T15:39:47+00:00"
        }, {"id": 116, "name": "Visitor #16", "date": "2020-06-16T00:54:03+00:00"}]
    }
};
const debugUnreadPagesResponse = [{
    "success": true, "page": 2, "value": {
        "total": 150,
        "data": [{"id": 42, "name": "Visitor #16", "date": "2020-06-12T17:57:47+00:00"}, {
            "id": 84,
            "name": "Visitor #17",
            "date": "2020-06-13T22:16:16+00:00"
        }, {"id": 35, "name": "Visitor #17", "date": "2020-06-13T11:48:00+00:00"}, {
            "id": 101,
            "name": "Visitor #18",
            "date": "2020-06-21T18:32:16+00:00"
        }, {"id": 26, "name": "Visitor #18", "date": "2020-06-17T17:04:25+00:00"}, {
            "id": 14,
            "name": "Visitor #18",
            "date": "2020-06-17T07:00:09+00:00"
        }, {"id": 66, "name": "Visitor #2", "date": "2020-06-11T00:47:54+00:00"}, {
            "id": 67,
            "name": "Visitor #20",
            "date": "2020-06-23T15:08:48+00:00"
        }, {"id": 50, "name": "Visitor #20", "date": "2020-06-22T09:57:38+00:00"}, {
            "id": 126,
            "name": "Visitor #21",
            "date": "2020-06-23T06:09:41+00:00"
        }, {"id": 100, "name": "Visitor #21", "date": "2020-06-16T12:27:08+00:00"}, {
            "id": 8,
            "name": "Visitor #21",
            "date": "2020-06-15T19:10:15+00:00"
        }, {"id": 115, "name": "Visitor #22", "date": "2020-06-18T20:40:33+00:00"}, {
            "id": 104,
            "name": "Visitor #22",
            "date": "2020-06-22T22:43:08+00:00"
        }, {"id": 147, "name": "Visitor #23", "date": "2020-06-23T09:19:42+00:00"}]
    }
}, {
    "success": true, "page": 3, "value": {
        "total": 150,
        "data": [{"id": 129, "name": "Visitor #24", "date": "2020-06-25T06:40:01+00:00"}, {
            "id": 53,
            "name": "Visitor #24",
            "date": "2020-06-15T03:04:15+00:00"
        }, {"id": 52, "name": "Visitor #24", "date": "2020-06-14T08:48:52+00:00"}, {
            "id": 5,
            "name": "Visitor #24",
            "date": "2020-06-25T09:10:34+00:00"
        }, {"id": 140, "name": "Visitor #25", "date": "2020-06-17T01:49:49+00:00"}, {
            "id": 103,
            "name": "Visitor #26",
            "date": "2020-06-22T15:02:28+00:00"
        }, {"id": 75, "name": "Visitor #26", "date": "2020-06-23T01:56:36+00:00"}, {
            "id": 119,
            "name": "Visitor #27",
            "date": "2020-06-17T17:19:21+00:00"
        }, {"id": 46, "name": "Visitor #27", "date": "2020-06-12T21:59:32+00:00"}, {
            "id": 112,
            "name": "Visitor #28",
            "date": "2020-06-13T06:35:22+00:00"
        }, {"id": 40, "name": "Visitor #28", "date": "2020-06-19T01:44:30+00:00"}, {
            "id": 9,
            "name": "Visitor #28",
            "date": "2020-06-14T11:29:22+00:00"
        }, {"id": 138, "name": "Visitor #29", "date": "2020-06-24T16:54:58+00:00"}, {
            "id": 127,
            "name": "Visitor #3",
            "date": "2020-06-18T23:51:12+00:00"
        }, {"id": 102, "name": "Visitor #3", "date": "2020-06-22T14:01:15+00:00"}]
    }
}, {
    "success": true, "page": 4, "value": {
        "total": 150,
        "data": [{"id": 34, "name": "Visitor #3", "date": "2020-06-24T04:10:46+00:00"}, {
            "id": 3,
            "name": "Visitor #3",
            "date": "2020-06-18T02:01:06+00:00"
        }, {"id": 124, "name": "Visitor #30", "date": "2020-06-25T01:58:36+00:00"}, {
            "id": 65,
            "name": "Visitor #30",
            "date": "2020-06-14T23:02:39+00:00"
        }, {"id": 15, "name": "Visitor #30", "date": "2020-06-18T04:53:22+00:00"}, {
            "id": 22,
            "name": "Visitor #31",
            "date": "2020-06-18T18:51:16+00:00"
        }, {"id": 105, "name": "Visitor #32", "date": "2020-06-18T18:48:13+00:00"}, {
            "id": 95,
            "name": "Visitor #32",
            "date": "2020-06-12T22:58:13+00:00"
        }, {"id": 96, "name": "Visitor #33", "date": "2020-06-22T21:12:33+00:00"}, {
            "id": 51,
            "name": "Visitor #33",
            "date": "2020-06-20T23:08:20+00:00"
        }, {"id": 71, "name": "Visitor #34", "date": "2020-06-20T11:35:06+00:00"}, {
            "id": 16,
            "name": "Visitor #34",
            "date": "2020-06-17T18:56:05+00:00"
        }, {"id": 10, "name": "Visitor #34", "date": "2020-06-15T19:13:41+00:00"}, {
            "id": 134,
            "name": "Visitor #35",
            "date": "2020-06-21T02:04:55+00:00"
        }, {"id": 117, "name": "Visitor #35", "date": "2020-06-12T17:50:27+00:00"}]
    }
}, {
    "success": true, "page": 5, "value": {
        "total": 150,
        "data": [{"id": 143, "name": "Visitor #37", "date": "2020-06-24T19:36:37+00:00"}, {
            "id": 30,
            "name": "Visitor #37",
            "date": "2020-06-11T04:47:20+00:00"
        }, {"id": 79, "name": "Visitor #40", "date": "2020-06-12T13:53:54+00:00"}, {
            "id": 80,
            "name": "Visitor #41",
            "date": "2020-06-25T11:47:35+00:00"
        }, {"id": 64, "name": "Visitor #41", "date": "2020-06-23T06:26:18+00:00"}, {
            "id": 131,
            "name": "Visitor #42",
            "date": "2020-06-18T12:25:05+00:00"
        }, {"id": 45, "name": "Visitor #42", "date": "2020-06-11T19:28:09+00:00"}, {
            "id": 19,
            "name": "Visitor #42",
            "date": "2020-06-23T18:59:49+00:00"
        }, {"id": 113, "name": "Visitor #43", "date": "2020-06-13T10:28:27+00:00"}, {
            "id": 37,
            "name": "Visitor #43",
            "date": "2020-06-25T03:10:03+00:00"
        }, {"id": 21, "name": "Visitor #43", "date": "2020-06-23T21:51:55+00:00"}, {
            "id": 4,
            "name": "Visitor #43",
            "date": "2020-06-18T06:38:22+00:00"
        }, {"id": 139, "name": "Visitor #45", "date": "2020-06-19T11:56:27+00:00"}, {
            "id": 69,
            "name": "Visitor #45",
            "date": "2020-06-18T15:07:47+00:00"
        }, {"id": 68, "name": "Visitor #45", "date": "2020-06-25T16:26:01+00:00"}]
    }
}, {
    "success": true, "page": 6, "value": {
        "total": 150,
        "data": [{"id": 118, "name": "Visitor #46", "date": "2020-06-18T20:48:20+00:00"}, {
            "id": 60,
            "name": "Visitor #46",
            "date": "2020-06-19T14:27:23+00:00"
        }, {"id": 122, "name": "Visitor #49", "date": "2020-06-15T03:58:00+00:00"}, {
            "id": 89,
            "name": "Visitor #49",
            "date": "2020-06-13T11:56:16+00:00"
        }, {"id": 18, "name": "Visitor #49", "date": "2020-06-11T18:08:00+00:00"}, {
            "id": 7,
            "name": "Visitor #5",
            "date": "2020-06-15T23:34:14+00:00"
        }, {"id": 149, "name": "Visitor #50", "date": "2020-06-12T14:29:09+00:00"}, {
            "id": 121,
            "name": "Visitor #50",
            "date": "2020-06-15T21:42:13+00:00"
        }, {"id": 94, "name": "Visitor #50", "date": "2020-06-24T20:11:30+00:00"}, {
            "id": 77,
            "name": "Visitor #50",
            "date": "2020-06-22T02:41:12+00:00"
        }, {"id": 31, "name": "Visitor #50", "date": "2020-06-25T19:31:27+00:00"}, {
            "id": 13,
            "name": "Visitor #50",
            "date": "2020-06-18T03:24:54+00:00"
        }, {"id": 128, "name": "Visitor #51", "date": "2020-06-21T14:35:02+00:00"}, {
            "id": 33,
            "name": "Visitor #51",
            "date": "2020-06-23T19:56:24+00:00"
        }, {"id": 106, "name": "Visitor #52", "date": "2020-06-16T08:45:15+00:00"}]
    }
}, {
    "success": true, "page": 7, "value": {
        "total": 150,
        "data": [{"id": 108, "name": "Visitor #53", "date": "2020-06-20T06:28:25+00:00"}, {
            "id": 144,
            "name": "Visitor #54",
            "date": "2020-06-24T15:12:50+00:00"
        }, {"id": 111, "name": "Visitor #54", "date": "2020-06-20T17:47:57+00:00"}, {
            "id": 63,
            "name": "Visitor #54",
            "date": "2020-06-11T06:53:53+00:00"
        }, {"id": 44, "name": "Visitor #57", "date": "2020-06-13T08:10:40+00:00"}, {
            "id": 97,
            "name": "Visitor #58",
            "date": "2020-06-22T12:12:45+00:00"
        }, {"id": 27, "name": "Visitor #58", "date": "2020-06-11T13:35:49+00:00"}, {
            "id": 90,
            "name": "Visitor #59",
            "date": "2020-06-25T16:28:27+00:00"
        }, {"id": 73, "name": "Visitor #59", "date": "2020-06-16T12:00:25+00:00"}, {
            "id": 59,
            "name": "Visitor #59",
            "date": "2020-06-24T20:46:19+00:00"
        }, {"id": 0, "name": "Visitor #59", "date": "2020-06-15T04:41:28+00:00"}, {
            "id": 82,
            "name": "Visitor #6",
            "date": "2020-06-20T01:44:04+00:00"
        }, {"id": 25, "name": "Visitor #6", "date": "2020-06-19T15:38:58+00:00"}, {
            "id": 133,
            "name": "Visitor #60",
            "date": "2020-06-17T23:45:21+00:00"
        }, {"id": 58, "name": "Visitor #60", "date": "2020-06-13T09:31:24+00:00"}]
    }
}, {
    "success": true, "page": 8, "value": {
        "total": 150,
        "data": [{"id": 2, "name": "Visitor #60", "date": "2020-06-23T06:27:55+00:00"}, {
            "id": 142,
            "name": "Visitor #61",
            "date": "2020-06-13T16:53:06+00:00"
        }, {"id": 125, "name": "Visitor #61", "date": "2020-06-20T14:39:28+00:00"}, {
            "id": 98,
            "name": "Visitor #61",
            "date": "2020-06-20T09:21:39+00:00"
        }, {"id": 6, "name": "Visitor #61", "date": "2020-06-22T23:46:14+00:00"}, {
            "id": 83,
            "name": "Visitor #62",
            "date": "2020-06-11T06:00:09+00:00"
        }, {"id": 24, "name": "Visitor #62", "date": "2020-06-25T07:47:51+00:00"}, {
            "id": 76,
            "name": "Visitor #63",
            "date": "2020-06-10T21:19:15+00:00"
        }, {"id": 57, "name": "Visitor #63", "date": "2020-06-20T12:22:24+00:00"}, {
            "id": 56,
            "name": "Visitor #63",
            "date": "2020-06-17T11:57:21+00:00"
        }, {"id": 54, "name": "Visitor #63", "date": "2020-06-12T13:22:23+00:00"}, {
            "id": 78,
            "name": "Visitor #64",
            "date": "2020-06-23T17:40:57+00:00"
        }, {"id": 74, "name": "Visitor #64", "date": "2020-06-25T01:07:29+00:00"}, {
            "id": 110,
            "name": "Visitor #65",
            "date": "2020-06-15T23:11:46+00:00"
        }, {"id": 130, "name": "Visitor #66", "date": "2020-06-19T02:13:04+00:00"}]
    }
}, {
    "success": true, "page": 9, "value": {
        "total": 150,
        "data": [{"id": 28, "name": "Visitor #66", "date": "2020-06-18T20:48:56+00:00"}, {
            "id": 120,
            "name": "Visitor #67",
            "date": "2020-06-17T04:57:14+00:00"
        }, {"id": 87, "name": "Visitor #67", "date": "2020-06-20T07:35:07+00:00"}, {
            "id": 72,
            "name": "Visitor #67",
            "date": "2020-06-24T17:58:54+00:00"
        }, {"id": 70, "name": "Visitor #67", "date": "2020-06-16T08:51:58+00:00"}, {
            "id": 146,
            "name": "Visitor #68",
            "date": "2020-06-11T11:25:31+00:00"
        }, {"id": 145, "name": "Visitor #68", "date": "2020-06-11T22:03:03+00:00"}, {
            "id": 123,
            "name": "Visitor #68",
            "date": "2020-06-11T19:42:46+00:00"
        }, {"id": 11, "name": "Visitor #68", "date": "2020-06-20T09:13:16+00:00"}, {
            "id": 148,
            "name": "Visitor #69",
            "date": "2020-06-16T08:54:46+00:00"
        }, {"id": 36, "name": "Visitor #69", "date": "2020-06-25T12:43:58+00:00"}, {
            "id": 137,
            "name": "Visitor #7",
            "date": "2020-06-18T02:17:24+00:00"
        }, {"id": 62, "name": "Visitor #7", "date": "2020-06-24T06:37:54+00:00"}, {
            "id": 23,
            "name": "Visitor #7",
            "date": "2020-06-22T03:30:17+00:00"
        }, {"id": 81, "name": "Visitor #70", "date": "2020-06-23T01:22:39+00:00"}]
    }
}, {
    "success": true, "page": 10, "value": {
        "total": 150,
        "data": [{"id": 107, "name": "Visitor #71", "date": "2020-06-13T23:52:23+00:00"}, {
            "id": 92,
            "name": "Visitor #71",
            "date": "2020-06-23T00:33:32+00:00"
        }, {"id": 61, "name": "Visitor #71", "date": "2020-06-12T13:14:03+00:00"}, {
            "id": 47,
            "name": "Visitor #71",
            "date": "2020-06-20T22:42:23+00:00"
        }, {"id": 38, "name": "Visitor #71", "date": "2020-06-15T18:52:21+00:00"}, {
            "id": 29,
            "name": "Visitor #71",
            "date": "2020-06-22T18:56:38+00:00"
        }, {"id": 91, "name": "Visitor #72", "date": "2020-06-15T06:23:09+00:00"}, {
            "id": 141,
            "name": "Visitor #73",
            "date": "2020-06-19T19:15:04+00:00"
        }, {"id": 135, "name": "Visitor #73", "date": "2020-06-17T03:23:08+00:00"}, {
            "id": 132,
            "name": "Visitor #73",
            "date": "2020-06-18T17:09:38+00:00"
        }, {"id": 88, "name": "Visitor #73", "date": "2020-06-19T02:58:52+00:00"}, {
            "id": 49,
            "name": "Visitor #74",
            "date": "2020-06-20T08:53:50+00:00"
        }, {"id": 32, "name": "Visitor #8", "date": "2020-06-18T03:54:39+00:00"}, {
            "id": 85,
            "name": "Visitor #9",
            "date": "2020-06-15T16:13:37+00:00"
        }, {"id": 41, "name": "Visitor #9", "date": "2020-06-23T10:52:01+00:00"}]
    }
}];

const debugDataChanged1FirstPageResponse =
  {"success":true,"page":1,"value":{"total":150,"data":[{"id":0,"name":"Visitor #0","date":"2020-06-30T19:52:14+00:00"},{"id":1,"name":"Visitor #1","date":"2020-06-29T13:57:45+00:00"},{"id":10,"name":"Visitor #10","date":"2020-06-30T11:17:00+00:00"},{"id":100,"name":"Visitor #100","date":"2020-06-24T15:12:25+00:00"},{"id":101,"name":"Visitor #101","date":"2020-07-05T15:12:26+00:00"},{"id":102,"name":"Visitor #102","date":"2020-06-27T16:45:32+00:00"},{"id":103,"name":"Visitor #103","date":"2020-06-25T00:08:23+00:00"},{"id":104,"name":"Visitor #104","date":"2020-07-04T07:25:39+00:00"},{"id":105,"name":"Visitor #105","date":"2020-07-01T17:02:59+00:00"},{"id":106,"name":"Visitor #106","date":"2020-06-22T07:31:10+00:00"},{"id":107,"name":"Visitor #107","date":"2020-06-22T13:22:39+00:00"},{"id":108,"name":"Visitor #108","date":"2020-06-21T09:56:55+00:00"},{"id":109,"name":"Visitor #109","date":"2020-06-23T19:15:58+00:00"},{"id":11,"name":"Visitor #11","date":"2020-06-22T10:22:41+00:00"},{"id":110,"name":"Visitor #110","date":"2020-06-26T04:35:43+00:00"}]}}
// const debugDataChanged1FirstPageResponse =
//   {"success":true,"page":1,"value":{"total":150,"data":[{"id":0,"name":"Visitor #0","date":"2020-06-30T19:52:14+00:00"},{"id":1,"name":"Visitor #1","date":"2020-06-29T13:57:45+00:00"},{"id":10,"name":"Visitor #10","date":"2020-06-30T11:17:00+00:00"},{"id":100,"name":"Visitor #100","date":"2020-06-24T15:12:25+00:00"},{"id":101,"name":"Visitor #101","date":"2020-07-05T15:12:26+00:00"},{"id":102,"name":"Visitor #102","date":"2020-06-27T16:45:32+00:00"},{"id":103,"name":"Visitor #103","date":"2020-06-25T00:08:23+00:00"},{"id":104,"name":"Visitor #104","date":"2020-07-04T07:25:39+00:00"},{"id":105,"name":"Visitor #105","date":"2020-07-01T17:02:59+00:00"},{"id":106,"name":"Visitor #106","date":"2020-06-22T07:31:10+00:00"},{"id":107,"name":"Visitor #107","date":"2020-06-22T13:22:39+00:00"},{"id":108,"name":"Visitor #108","date":"2020-06-21T09:56:55+00:00"},{"id":109,"name":"Visitor #109","date":"2020-06-23T19:15:58+00:00"},{"id":11,"name":"Visitor #11","date":"2020-06-22T10:22:41+00:00"},{"id":110,"name":"Visitor #110","date":"2020-06-26T04:35:43+00:00"}]}};

const debugDataChanged1UnreadPageResponses =
  [{"success":true,"page":2,"value":{"total":152,"data":[{"id":110,"name":"Visitor #110","date":"2020-06-26T04:35:43+00:00"},{"id":111,"name":"Visitor #111","date":"2020-06-21T10:28:21+00:00"},{"id":112,"name":"Visitor #112","date":"2020-07-04T04:20:01+00:00"},{"id":113,"name":"Visitor #113","date":"2020-06-24T18:02:47+00:00"},{"id":114,"name":"Visitor #114","date":"2020-06-30T20:54:43+00:00"},{"id":115,"name":"Visitor #115","date":"2020-07-04T06:09:32+00:00"},{"id":150,"date":"2020-07-06T15:32:51.938Z","name":"Visitor #116"},{"id":116,"name":"Visitor #116","date":"2020-06-29T20:33:56+00:00"},{"id":117,"name":"Visitor #117","date":"2020-07-05T17:18:52+00:00"},{"id":118,"name":"Visitor #118","date":"2020-07-02T20:51:43+00:00"},{"id":119,"name":"Visitor #119","date":"2020-07-04T21:41:11+00:00"},{"id":12,"name":"Visitor #12","date":"2020-07-02T10:49:56+00:00"},{"id":120,"name":"Visitor #120","date":"2020-06-29T18:47:24+00:00"},{"id":121,"name":"Visitor #121","date":"2020-07-01T04:12:33+00:00"},{"id":122,"name":"Visitor #122","date":"2020-07-04T20:57:23+00:00"}]}},{"success":true,"page":3,"value":{"total":153,"data":[{"id":125,"name":"Visitor #125","date":"2020-06-27T12:01:46+00:00"},{"id":126,"name":"Visitor #126","date":"2020-06-30T22:24:29+00:00"},{"id":127,"name":"Visitor #127","date":"2020-06-25T17:04:15+00:00"},{"id":128,"name":"Visitor #128","date":"2020-06-25T16:52:00+00:00"},{"id":129,"name":"Visitor #129","date":"2020-06-26T09:13:36+00:00"},{"id":13,"name":"Visitor #13","date":"2020-07-02T13:50:42+00:00"},{"id":130,"name":"Visitor #130","date":"2020-06-25T14:24:28+00:00"},{"id":131,"name":"Visitor #131","date":"2020-07-01T13:54:43+00:00"},{"id":132,"name":"Visitor #132","date":"2020-06-21T03:56:52+00:00"},{"id":133,"name":"Visitor #133","date":"2020-06-28T05:37:56+00:00"},{"id":134,"name":"Visitor #134","date":"2020-06-27T19:35:19+00:00"},{"id":135,"name":"Visitor #135","date":"2020-07-01T17:54:35+00:00"},{"id":136,"name":"Visitor #136","date":"2020-06-29T09:32:30+00:00"},{"id":137,"name":"Visitor #137","date":"2020-06-26T12:28:16+00:00"},{"id":138,"name":"Visitor #138","date":"2020-07-03T09:56:32+00:00"}]}},{"success":true,"page":4,"value":{"total":154,"data":[{"id":138,"name":"Visitor #138","date":"2020-07-03T09:56:32+00:00"},{"id":139,"name":"Visitor #139","date":"2020-07-01T02:57:41+00:00"},{"id":14,"name":"Visitor #14","date":"2020-07-04T15:50:53+00:00"},{"id":140,"name":"Visitor #140","date":"2020-06-25T09:05:51+00:00"},{"id":141,"name":"Visitor #141","date":"2020-07-03T21:23:04+00:00"},{"id":142,"name":"Visitor #142","date":"2020-07-03T01:23:15+00:00"},{"id":143,"name":"Visitor #143","date":"2020-06-27T02:56:23+00:00"},{"id":144,"name":"Visitor #144","date":"2020-07-04T09:39:41+00:00"},{"id":145,"name":"Visitor #145","date":"2020-06-25T16:21:02+00:00"},{"id":146,"name":"Visitor #146","date":"2020-06-21T16:09:59+00:00"},{"id":147,"name":"Visitor #147","date":"2020-07-04T02:11:47+00:00"},{"id":148,"name":"Visitor #148","date":"2020-06-22T09:45:51+00:00"},{"id":149,"name":"Visitor #149","date":"2020-06-26T00:21:46+00:00"},{"id":153,"date":"2020-07-06T15:32:51.941Z","name":"Visitor #15"},{"id":15,"name":"Visitor #15","date":"2020-06-21T21:09:20+00:00"}]}},{"success":true,"page":5,"value":{"total":157,"data":[{"id":18,"name":"Visitor #18","date":"2020-06-29T09:44:47+00:00"},{"id":19,"name":"Visitor #19","date":"2020-06-28T10:57:59+00:00"},{"id":150,"date":"2020-07-06T15:32:51.961Z","name":"Visitor #2"},{"id":2,"name":"Visitor #2","date":"2020-06-22T02:19:54+00:00"},{"id":20,"name":"Visitor #20","date":"2020-07-03T22:26:35+00:00"},{"id":21,"name":"Visitor #21","date":"2020-06-23T04:36:17+00:00"},{"id":22,"name":"Visitor #22","date":"2020-07-01T00:22:20+00:00"},{"id":23,"name":"Visitor #23","date":"2020-07-03T20:48:51+00:00"},{"id":24,"name":"Visitor #24","date":"2020-06-30T07:14:14+00:00"},{"id":25,"name":"Visitor #25","date":"2020-06-21T17:55:45+00:00"},{"id":26,"name":"Visitor #26","date":"2020-06-29T07:09:50+00:00"},{"id":27,"name":"Visitor #27","date":"2020-06-27T13:53:37+00:00"},{"id":28,"name":"Visitor #28","date":"2020-07-02T12:31:29+00:00"},{"id":29,"name":"Visitor #29","date":"2020-06-23T23:45:56+00:00"},{"id":3,"name":"Visitor #3","date":"2020-06-29T15:20:03+00:00"}]}},{"success":true,"page":6,"value":{"total":158,"data":[{"id":25,"name":"Visitor #25","date":"2020-06-21T17:55:45+00:00"},{"id":26,"name":"Visitor #26","date":"2020-06-29T07:09:50+00:00"},{"id":150,"date":"2020-07-06T15:32:51.962Z","name":"Visitor #27"},{"id":27,"name":"Visitor #27","date":"2020-06-27T13:53:37+00:00"},{"id":28,"name":"Visitor #28","date":"2020-07-02T12:31:29+00:00"},{"id":29,"name":"Visitor #29","date":"2020-06-23T23:45:56+00:00"},{"id":3,"name":"Visitor #3","date":"2020-06-29T15:20:03+00:00"},{"id":30,"name":"Visitor #30","date":"2020-06-26T21:36:44+00:00"},{"id":31,"name":"Visitor #31","date":"2020-07-02T17:04:13+00:00"},{"id":32,"name":"Visitor #32","date":"2020-06-23T15:43:01+00:00"},{"id":33,"name":"Visitor #33","date":"2020-06-25T10:47:49+00:00"},{"id":34,"name":"Visitor #34","date":"2020-07-05T09:44:48+00:00"},{"id":35,"name":"Visitor #35","date":"2020-07-01T01:47:12+00:00"},{"id":36,"name":"Visitor #36","date":"2020-06-26T03:06:35+00:00"},{"id":37,"name":"Visitor #37","date":"2020-07-01T20:07:18+00:00"}]}},{"success":true,"page":7,"value":{"total":155,"data":[{"id":41,"name":"Visitor #41","date":"2020-06-22T13:30:36+00:00"},{"id":42,"name":"Visitor #42","date":"2020-06-21T04:56:00+00:00"},{"id":43,"name":"Visitor #43","date":"2020-07-01T16:12:10+00:00"},{"id":44,"name":"Visitor #44","date":"2020-06-29T03:58:33+00:00"},{"id":45,"name":"Visitor #45","date":"2020-06-28T18:10:04+00:00"},{"id":46,"name":"Visitor #46","date":"2020-06-25T18:12:47+00:00"},{"id":47,"name":"Visitor #47","date":"2020-07-02T07:37:12+00:00"},{"id":48,"name":"Visitor #48","date":"2020-06-23T00:48:20+00:00"},{"id":49,"name":"Visitor #49","date":"2020-06-26T07:05:58+00:00"},{"id":5,"name":"Visitor #5","date":"2020-06-28T22:45:05+00:00"},{"id":50,"name":"Visitor #50","date":"2020-07-03T12:27:57+00:00"},{"id":51,"name":"Visitor #51","date":"2020-06-26T20:30:05+00:00"},{"id":52,"name":"Visitor #52","date":"2020-06-23T19:18:31+00:00"},{"id":53,"name":"Visitor #53","date":"2020-07-03T14:08:45+00:00"},{"id":54,"name":"Visitor #54","date":"2020-07-02T17:51:14+00:00"}]}},{"success":true,"page":8,"value":{"total":156,"data":[{"id":56,"name":"Visitor #56","date":"2020-07-04T12:17:00+00:00"},{"id":57,"name":"Visitor #57","date":"2020-07-03T16:15:02+00:00"},{"id":58,"name":"Visitor #58","date":"2020-07-01T10:47:46+00:00"},{"id":154,"date":"2020-07-06T15:32:51.960Z","name":"Visitor #59"},{"id":59,"name":"Visitor #59","date":"2020-06-24T16:47:56+00:00"},{"id":6,"name":"Visitor #6","date":"2020-07-01T03:12:52+00:00"},{"id":60,"name":"Visitor #60","date":"2020-06-22T03:04:36+00:00"},{"id":61,"name":"Visitor #61","date":"2020-06-23T04:25:41+00:00"},{"id":62,"name":"Visitor #62","date":"2020-06-29T18:51:43+00:00"},{"id":63,"name":"Visitor #63","date":"2020-06-26T13:22:47+00:00"},{"id":64,"name":"Visitor #64","date":"2020-06-23T20:31:39+00:00"},{"id":65,"name":"Visitor #65","date":"2020-06-25T07:20:24+00:00"},{"id":66,"name":"Visitor #66","date":"2020-06-29T21:35:30+00:00"},{"id":67,"name":"Visitor #67","date":"2020-06-26T08:07:47+00:00"},{"id":68,"name":"Visitor #68","date":"2020-07-05T04:44:08+00:00"}]}},{"success":true,"page":9,"value":{"total":159,"data":[{"id":65,"name":"Visitor #65","date":"2020-06-25T07:20:24+00:00"},{"id":66,"name":"Visitor #66","date":"2020-06-29T21:35:30+00:00"},{"id":67,"name":"Visitor #67","date":"2020-06-26T08:07:47+00:00"},{"id":68,"name":"Visitor #68","date":"2020-07-05T04:44:08+00:00"},{"id":69,"name":"Visitor #69","date":"2020-06-30T21:51:39+00:00"},{"id":7,"name":"Visitor #7","date":"2020-07-04T04:33:01+00:00"},{"id":70,"name":"Visitor #70","date":"2020-06-28T04:25:58+00:00"},{"id":71,"name":"Visitor #71","date":"2020-07-02T18:57:30+00:00"},{"id":72,"name":"Visitor #72","date":"2020-07-04T17:48:21+00:00"},{"id":73,"name":"Visitor #73","date":"2020-07-02T14:34:40+00:00"},{"id":74,"name":"Visitor #74","date":"2020-06-28T03:42:24+00:00"},{"id":75,"name":"Visitor #75","date":"2020-06-26T23:59:39+00:00"},{"id":76,"name":"Visitor #76","date":"2020-06-21T10:46:14+00:00"},{"id":77,"name":"Visitor #77","date":"2020-06-28T11:44:51+00:00"},{"id":78,"name":"Visitor #78","date":"2020-06-23T06:34:37+00:00"}]}},{"success":true,"page":10,"value":{"total":151,"data":[{"id":85,"name":"Visitor #85","date":"2020-07-05T07:30:23+00:00"},{"id":86,"name":"Visitor #86","date":"2020-06-26T14:40:46+00:00"},{"id":87,"name":"Visitor #87","date":"2020-07-05T04:19:43+00:00"},{"id":88,"name":"Visitor #88","date":"2020-07-02T02:20:47+00:00"},{"id":89,"name":"Visitor #89","date":"2020-06-24T21:43:47+00:00"},{"id":9,"name":"Visitor #9","date":"2020-06-29T13:41:22+00:00"},{"id":90,"name":"Visitor #90","date":"2020-07-02T11:10:46+00:00"},{"id":91,"name":"Visitor #91","date":"2020-06-22T03:13:49+00:00"},{"id":92,"name":"Visitor #92","date":"2020-07-03T17:45:51+00:00"},{"id":93,"name":"Visitor #93","date":"2020-07-05T07:44:21+00:00"},{"id":94,"name":"Visitor #94","date":"2020-07-05T13:33:07+00:00"},{"id":95,"name":"Visitor #95","date":"2020-07-01T12:01:40+00:00"},{"id":96,"name":"Visitor #96","date":"2020-07-04T19:57:04+00:00"},{"id":97,"name":"Visitor #97","date":"2020-06-23T11:58:12+00:00"},{"id":98,"name":"Visitor #98","date":"2020-06-23T00:52:35+00:00"}]}}];
// const debugDataChanged1UnreadPageResponses =
//   [{"success":true,"page":2,"value":{"total":151,"data":[{"id":110,"name":"Visitor #110","date":"2020-06-26T04:35:43+00:00"},{"id":111,"name":"Visitor #111","date":"2020-06-21T10:28:21+00:00"},{"id":112,"name":"Visitor #112","date":"2020-07-04T04:20:01+00:00"},{"id":113,"name":"Visitor #113","date":"2020-06-24T18:02:47+00:00"},{"id":114,"name":"Visitor #114","date":"2020-06-30T20:54:43+00:00"},{"id":115,"name":"Visitor #115","date":"2020-07-04T06:09:32+00:00"},{"id":116,"name":"Visitor #116","date":"2020-06-29T20:33:56+00:00"},{"id":117,"name":"Visitor #117","date":"2020-07-05T17:18:52+00:00"},{"id":118,"name":"Visitor #118","date":"2020-07-02T20:51:43+00:00"},{"id":119,"name":"Visitor #119","date":"2020-07-04T21:41:11+00:00"},{"id":12,"name":"Visitor #12","date":"2020-07-02T10:49:56+00:00"},{"id":120,"name":"Visitor #120","date":"2020-06-29T18:47:24+00:00"},{"id":121,"name":"Visitor #121","date":"2020-07-01T04:12:33+00:00"},{"id":122,"name":"Visitor #122","date":"2020-07-04T20:57:23+00:00"},{"id":123,"name":"Visitor #123","date":"2020-06-22T07:19:08+00:00"}]}},{"success":true,"page":3,"value":{"total":153,"data":[{"id":125,"name":"Visitor #125","date":"2020-06-27T12:01:46+00:00"},{"id":126,"name":"Visitor #126","date":"2020-06-30T22:24:29+00:00"},{"id":127,"name":"Visitor #127","date":"2020-06-25T17:04:15+00:00"},{"id":128,"name":"Visitor #128","date":"2020-06-25T16:52:00+00:00"},{"id":129,"name":"Visitor #129","date":"2020-06-26T09:13:36+00:00"},{"id":13,"name":"Visitor #13","date":"2020-07-02T13:50:42+00:00"},{"id":130,"name":"Visitor #130","date":"2020-06-25T14:24:28+00:00"},{"id":131,"name":"Visitor #131","date":"2020-07-01T13:54:43+00:00"},{"id":132,"name":"Visitor #132","date":"2020-06-21T03:56:52+00:00"},{"id":133,"name":"Visitor #133","date":"2020-06-28T05:37:56+00:00"},{"id":134,"name":"Visitor #134","date":"2020-06-27T19:35:19+00:00"},{"id":135,"name":"Visitor #135","date":"2020-07-01T17:54:35+00:00"},{"id":136,"name":"Visitor #136","date":"2020-06-29T09:32:30+00:00"},{"id":137,"name":"Visitor #137","date":"2020-06-26T12:28:16+00:00"},{"id":138,"name":"Visitor #138","date":"2020-07-03T09:56:32+00:00"}]}},{"success":true,"page":4,"value":{"total":157,"data":[{"id":137,"name":"Visitor #137","date":"2020-06-26T12:28:16+00:00"},{"id":138,"name":"Visitor #138","date":"2020-07-03T09:56:32+00:00"},{"id":139,"name":"Visitor #139","date":"2020-07-01T02:57:41+00:00"},{"id":151,"date":"2020-07-06T14:15:10.757Z","name":"Visitor #14"},{"id":14,"name":"Visitor #14","date":"2020-07-04T15:50:53+00:00"},{"id":140,"name":"Visitor #140","date":"2020-06-25T09:05:51+00:00"},{"id":141,"name":"Visitor #141","date":"2020-07-03T21:23:04+00:00"},{"id":142,"name":"Visitor #142","date":"2020-07-03T01:23:15+00:00"},{"id":143,"name":"Visitor #143","date":"2020-06-27T02:56:23+00:00"},{"id":144,"name":"Visitor #144","date":"2020-07-04T09:39:41+00:00"},{"id":145,"name":"Visitor #145","date":"2020-06-25T16:21:02+00:00"},{"id":146,"name":"Visitor #146","date":"2020-06-21T16:09:59+00:00"},{"id":147,"name":"Visitor #147","date":"2020-07-04T02:11:47+00:00"},{"id":148,"name":"Visitor #148","date":"2020-06-22T09:45:51+00:00"},{"id":149,"name":"Visitor #149","date":"2020-06-26T00:21:46+00:00"}]}},{"success":true,"page":5,"value":{"total":155,"data":[{"id":16,"name":"Visitor #16","date":"2020-06-26T17:34:03+00:00"},{"id":17,"name":"Visitor #17","date":"2020-07-03T03:45:05+00:00"},{"id":18,"name":"Visitor #18","date":"2020-06-29T09:44:47+00:00"},{"id":19,"name":"Visitor #19","date":"2020-06-28T10:57:59+00:00"},{"id":2,"name":"Visitor #2","date":"2020-06-22T02:19:54+00:00"},{"id":20,"name":"Visitor #20","date":"2020-07-03T22:26:35+00:00"},{"id":21,"name":"Visitor #21","date":"2020-06-23T04:36:17+00:00"},{"id":22,"name":"Visitor #22","date":"2020-07-01T00:22:20+00:00"},{"id":23,"name":"Visitor #23","date":"2020-07-03T20:48:51+00:00"},{"id":24,"name":"Visitor #24","date":"2020-06-30T07:14:14+00:00"},{"id":25,"name":"Visitor #25","date":"2020-06-21T17:55:45+00:00"},{"id":26,"name":"Visitor #26","date":"2020-06-29T07:09:50+00:00"},{"id":27,"name":"Visitor #27","date":"2020-06-27T13:53:37+00:00"},{"id":28,"name":"Visitor #28","date":"2020-07-02T12:31:29+00:00"},{"id":29,"name":"Visitor #29","date":"2020-06-23T23:45:56+00:00"}]}},{"success":true,"page":6,"value":{"total":156,"data":[{"id":29,"name":"Visitor #29","date":"2020-06-23T23:45:56+00:00"},{"id":3,"name":"Visitor #3","date":"2020-06-29T15:20:03+00:00"},{"id":30,"name":"Visitor #30","date":"2020-06-26T21:36:44+00:00"},{"id":31,"name":"Visitor #31","date":"2020-07-02T17:04:13+00:00"},{"id":32,"name":"Visitor #32","date":"2020-06-23T15:43:01+00:00"},{"id":33,"name":"Visitor #33","date":"2020-06-25T10:47:49+00:00"},{"id":34,"name":"Visitor #34","date":"2020-07-05T09:44:48+00:00"},{"id":35,"name":"Visitor #35","date":"2020-07-01T01:47:12+00:00"},{"id":36,"name":"Visitor #36","date":"2020-06-26T03:06:35+00:00"},{"id":37,"name":"Visitor #37","date":"2020-07-01T20:07:18+00:00"},{"id":38,"name":"Visitor #38","date":"2020-07-02T11:10:22+00:00"},{"id":39,"name":"Visitor #39","date":"2020-06-29T11:42:30+00:00"},{"id":4,"name":"Visitor #4","date":"2020-06-27T13:19:41+00:00"},{"id":40,"name":"Visitor #40","date":"2020-07-01T15:14:09+00:00"},{"id":154,"date":"2020-07-06T14:15:10.756Z","name":"Visitor #41"}]}},{"success":true,"page":7,"value":{"total":154,"data":[{"id":42,"name":"Visitor #42","date":"2020-06-21T04:56:00+00:00"},{"id":43,"name":"Visitor #43","date":"2020-07-01T16:12:10+00:00"},{"id":44,"name":"Visitor #44","date":"2020-06-29T03:58:33+00:00"},{"id":45,"name":"Visitor #45","date":"2020-06-28T18:10:04+00:00"},{"id":46,"name":"Visitor #46","date":"2020-06-25T18:12:47+00:00"},{"id":47,"name":"Visitor #47","date":"2020-07-02T07:37:12+00:00"},{"id":48,"name":"Visitor #48","date":"2020-06-23T00:48:20+00:00"},{"id":49,"name":"Visitor #49","date":"2020-06-26T07:05:58+00:00"},{"id":5,"name":"Visitor #5","date":"2020-06-28T22:45:05+00:00"},{"id":50,"name":"Visitor #50","date":"2020-07-03T12:27:57+00:00"},{"id":51,"name":"Visitor #51","date":"2020-06-26T20:30:05+00:00"},{"id":52,"name":"Visitor #52","date":"2020-06-23T19:18:31+00:00"},{"id":53,"name":"Visitor #53","date":"2020-07-03T14:08:45+00:00"},{"id":54,"name":"Visitor #54","date":"2020-07-02T17:51:14+00:00"},{"id":55,"name":"Visitor #55","date":"2020-06-30T13:25:37+00:00"}]}},{"success":true,"page":8,"value":{"total":152,"data":[{"id":58,"name":"Visitor #58","date":"2020-07-01T10:47:46+00:00"},{"id":59,"name":"Visitor #59","date":"2020-06-24T16:47:56+00:00"},{"id":6,"name":"Visitor #6","date":"2020-07-01T03:12:52+00:00"},{"id":60,"name":"Visitor #60","date":"2020-06-22T03:04:36+00:00"},{"id":61,"name":"Visitor #61","date":"2020-06-23T04:25:41+00:00"},{"id":62,"name":"Visitor #62","date":"2020-06-29T18:51:43+00:00"},{"id":63,"name":"Visitor #63","date":"2020-06-26T13:22:47+00:00"},{"id":64,"name":"Visitor #64","date":"2020-06-23T20:31:39+00:00"},{"id":65,"name":"Visitor #65","date":"2020-06-25T07:20:24+00:00"},{"id":66,"name":"Visitor #66","date":"2020-06-29T21:35:30+00:00"},{"id":67,"name":"Visitor #67","date":"2020-06-26T08:07:47+00:00"},{"id":68,"name":"Visitor #68","date":"2020-07-05T04:44:08+00:00"},{"id":69,"name":"Visitor #69","date":"2020-06-30T21:51:39+00:00"},{"id":7,"name":"Visitor #7","date":"2020-07-04T04:33:01+00:00"},{"id":70,"name":"Visitor #70","date":"2020-06-28T04:25:58+00:00"}]}},{"success":true,"page":9,"value":{"total":159,"data":[{"id":68,"name":"Visitor #68","date":"2020-07-05T04:44:08+00:00"},{"id":69,"name":"Visitor #69","date":"2020-06-30T21:51:39+00:00"},{"id":7,"name":"Visitor #7","date":"2020-07-04T04:33:01+00:00"},{"id":70,"name":"Visitor #70","date":"2020-06-28T04:25:58+00:00"},{"id":150,"date":"2020-07-06T14:15:10.759Z","name":"Visitor #71"},{"id":71,"name":"Visitor #71","date":"2020-07-02T18:57:30+00:00"},{"id":72,"name":"Visitor #72","date":"2020-07-04T17:48:21+00:00"},{"id":73,"name":"Visitor #73","date":"2020-07-02T14:34:40+00:00"},{"id":74,"name":"Visitor #74","date":"2020-06-28T03:42:24+00:00"},{"id":75,"name":"Visitor #75","date":"2020-06-26T23:59:39+00:00"},{"id":76,"name":"Visitor #76","date":"2020-06-21T10:46:14+00:00"},{"id":157,"date":"2020-07-06T14:15:10.759Z","name":"Visitor #77"},{"id":77,"name":"Visitor #77","date":"2020-06-28T11:44:51+00:00"},{"id":78,"name":"Visitor #78","date":"2020-06-23T06:34:37+00:00"},{"id":154,"date":"2020-07-06T14:15:10.759Z","name":"Visitor #79"}]}},{"success":true,"page":10,"value":{"total":158,"data":[{"id":80,"name":"Visitor #80","date":"2020-06-27T19:23:06+00:00"},{"id":81,"name":"Visitor #81","date":"2020-06-26T04:52:22+00:00"},{"id":82,"name":"Visitor #82","date":"2020-07-05T16:50:38+00:00"},{"id":83,"name":"Visitor #83","date":"2020-07-04T15:26:05+00:00"},{"id":84,"name":"Visitor #84","date":"2020-06-27T02:42:15+00:00"},{"id":85,"name":"Visitor #85","date":"2020-07-05T07:30:23+00:00"},{"id":86,"name":"Visitor #86","date":"2020-06-26T14:40:46+00:00"},{"id":87,"name":"Visitor #87","date":"2020-07-05T04:19:43+00:00"},{"id":88,"name":"Visitor #88","date":"2020-07-02T02:20:47+00:00"},{"id":89,"name":"Visitor #89","date":"2020-06-24T21:43:47+00:00"},{"id":9,"name":"Visitor #9","date":"2020-06-29T13:41:22+00:00"},{"id":90,"name":"Visitor #90","date":"2020-07-02T11:10:46+00:00"},{"id":91,"name":"Visitor #91","date":"2020-06-22T03:13:49+00:00"},{"id":92,"name":"Visitor #92","date":"2020-07-03T17:45:51+00:00"},{"id":151,"date":"2020-07-06T14:15:10.758Z","name":"Visitor #93"}]}}];

const debugStartMoment =
  '2020-07-06T15:32:45.276Z';
// const debugStartMoment =
//   '2020-07-06T14:26:20.107Z';
const IS_DEBUG_ENABLED = false;
// const IS_LOG_RESPONSES = IS_DEBUG_ENABLED ? true: false;
const IS_LOG_RESPONSES = IS_DEBUG_ENABLED || true ? true: false;

const IS_DEBUG_FROM_DUMP = true;

const DUMP_FILE_PATH = 'log_2020_7_9__17.6.25_';

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



const fetchTokenFn = async () =>  {
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
        if (IS_DEBUG_ENABLED) {
            if (page === 1 ) {
                // return debugFirstPageResponse;
                return debugDataChanged1FirstPageResponse;
            } else {
                // return debugUnreadPagesResponse[page-2];
                return debugDataChanged1UnreadPageResponses[page-2];
            }
        }
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


        console.error('tailPagesResponses a1 JSON STRINGIFY', JSON.stringify(tailPagesResponses) );
        console.error('tailPagesResponses a1', (tailPagesResponses) );

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
        console.log('pageScanResults', JSON.stringify(pageScanResults));
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

            console.error('missedPageResponses a1 JSON STRINGIFY', JSON.stringify(missedPageResponses) );
            console.error('missedPageResponses a1', (missedPageResponses) );

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
    console.log(JSON.stringify(pageResponses));
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

        console.error('a1');
        const token = await fetchTokenFn();
        if (token === false) {
            console.error('Error: Auth request failed');
            return;
        }

        let startMoment = new Date();
        if (IS_DEBUG_ENABLED) {
            startMoment = new Date(debugStartMoment);
        }

        const fileLogger = (label, data) => {
            if (!IS_LOG_RESPONSES) {
                return;
            }
            const sm = startMoment;
            const dateTimeStr = sm.getFullYear() + '_' + (sm.getMonth() + 1) + '_' + sm.getDate() +
              '__' + sm.getHours() + '.' + sm.getMinutes() + '.' + sm.getSeconds();
            const fileName = 'log_' + dateTimeStr + '_' + label;
            if (data === undefined && label === '') {
                data = fileName;
            }

            fs.writeFile('logs/' + fileName, data, () => {});
        };

        const fileReadDump = (label) => {
            const path = 'logs/' + DUMP_FILE_PATH + label;
            return fs.readFileSync(path);
        };

        fileLogger('', undefined);
        fileLogger('startMoment', startMoment);

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

        // const unreadPagesResponses = await pageIdListFetchFn(unreadPageIds);

        let unreadPagesResponses;
        if (IS_DEBUG_FROM_DUMP) {
            unreadPagesResponses = JSON.parse(fileReadDump('unreadPagesResponses.json'));
        } else {
            unreadPagesResponses = await pageIdListFetchFn(unreadPageIds);
            fileLogger('unreadPagesResponses.json', JSON.stringify(unreadPagesResponses));
        }

        console.error('firstPageResponse a1 JSON STRINGIFY', JSON.stringify(firstPageResponse) );
        console.error('firstPageResponse a1', (firstPageResponse) );
        console.error('unreadPagesResponses a1 JSON STRINGIFY', JSON.stringify(unreadPagesResponses) );
        console.error('unreadPagesResponses a1', (unreadPagesResponses) );

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

        fileLogger('isDataChanged', JSON.stringify(isDataChanged));
        fileLogger(
          (
              'visits_' + visits.length + '_of_[' + total + ']_' +
              (isDataChanged ? 'dataIsNONStatic' : 'dataIsStatic' ) +
              '.json'
          ),
          JSON.stringify(visits));
        console.log('isDataChanged', isDataChanged);

    } catch (err) {
    
        console.error('err', err);
    }

};

listUsers();
