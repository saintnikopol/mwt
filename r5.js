/*
150 total start                 true items
                                , true not repeat
                                 + from start total
                                 --- xxx

150 : 1 : a..A                  15,15:   + 0    / 0
Adjustment
160 : 2 : x , b, x , ..B         13,13 : + 10 / --2  [8]
Mis
151 : 3 : c .. C                 15,15 :  + 1 / 0
Overlap
153 : 4 : Cd ...D                15,14:   + 3 / 0
MisMis
152 : 5 : e .x..E                14,14:    +2  / --1
Overlap
159 : 6  ExEEE f.. F             14,10 :   + 9 / --1
MisMisMis
155 : 7 g ...G                   15,15 :    +5 / 0
Overlap
156 : 8 GGh..H                   15, 13:   + 6 / 0
Mis
154 : 9 i..I                     15, 15    +4 / 0
Overlap
157 : 10 I ..x.j.x..J            13, 12    + 7 / --2
Overlap
160 : 11 JJJ.k..K                10, 7     +10 / 0
*/

//157 : 11 jj kkkk K                   7, 7     +7 / 0
//158 : 11 jj kxkkk K                   8, 8     +8 / 0
//158 : 11 jjj kkkk K                   8, 8     +8/ 0

// 177 : 10 I ..x.j.x..J            13, 12    + 27 / --2 | 25
// Overlap
// 160 : 11 J3k7                    10, 7     +10 / 0

// 15  + 13 + 15 + 14 + 14 + 10 + 15 + 13 + 15 + 12 + 7



// [1]  a..A  ADJ/MIS,  [0 .. 14]          +0 /-0|0    15 left 0 right 0

// [2] xbx..B ADJ/MIS   [15/23 .. 31/39]   +10/-2|8    13 left 0/8 right 0/8

// [3, 4] c..Cd..D      [30/31 .. 59/60]   +1 /-0|1    15 left 0/1 right 0/1
// [3, 4] c..Cd..D      [30/31 .. 59/60]       29 left 0/1 right 2/3



/// 180 : 2 : x , b, x , ..B         13,13 : + 30 / --2  [28]



let mutableRecordsIndex = {
    records: {
        1 : {
            pageIndexes: {
                1: 3,
                2: 0,
                10: 14,
            }
        },
        47 : {
            pageIndexes: {
                4: 13,
                5: 2,
            }
        }
    }
}