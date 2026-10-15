#!/bin/bash
#
# Copyright (c) 2012, 2024, Oracle and/or its affiliates. All rights reserved.
# DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
#
# This code is free software; you can redistribute it and/or modify it
# under the terms of the GNU General Public License version 2 only, as
# published by the Free Software Foundation.
#
# This code is distributed in the hope that it will be useful, but WITHOUT
# ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
# FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
# version 2 for more details (a copy is included in the LICENSE file that
# accompanied this code).
#
# You should have received a copy of the GNU General Public License version
# 2 along with this work; if not, write to the Free Software Foundation,
# Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301 USA.
#
# Please contact Oracle, 500 Oracle Parkway, Redwood Shores, CA 94065 USA
# or visit www.oracle.com if you need additional information or have any
# questions.
#

# This script is processed by configure before it's usable. It is run from
# the root of the build directory.


################################################################################
# Substitutions from autoconf

export LEGACY_BUILD_DIR=emscripten-_zero_

export OPENJDK_BUILD_OS_ENV="linux"
export OPENJDK_TARGET_OS="emscripten"
export OPENJDK_TARGET_CPU="zero"
export DEBUG_LEVEL="release"

export AWK="/usr/bin/gawk"
export BASH="/usr/bin/bash"
export CAT="/usr/bin/cat"
export CMP="/usr/bin/cmp"
export CODESIGN=""
export CP="/usr/bin/cp"
export CUT="/usr/bin/cut"
export DIFF="/usr/bin/diff"
export DUMPBIN=""
export ECHO="echo"
export EXPR="/usr/bin/expr"
export FILE="/usr/bin/file"
export FIND="/usr/bin/find"
export GREP="/usr/bin/grep"
export GUNZIP="/usr/bin/gunzip"
export HEAD="/usr/bin/head"
export LDD="/usr/bin/ldd"
export LN="/usr/bin/ln"
export MKDIR="/usr/bin/mkdir"
export MV="/usr/bin/mv"
export NM="/usr/bin/nm"
export OBJDUMP="/usr/bin/objdump"
export OTOOL=""
export PRINTF="printf"
export READELF="/usr/bin/readelf"
export RM="/usr/bin/rm -f"
export SED="/usr/bin/sed"
export SORT="/usr/bin/sort"
export STAT="/usr/bin/stat"
export STRIP="/usr/bin/strip --strip-debug"
export TAR="/usr/bin/tar"
export TEE="/usr/bin/tee"
export UNIQ="/usr/bin/uniq"
export UNARCHIVE="/usr/bin/unzip -q -o"

export TOPDIR="/mnt/d/learn/concurrencykimi/javabox-research/openjdk"
export OUTPUTDIR="/mnt/d/learn/concurrencykimi/javabox-research/openjdk/build/emscripten-zero"

if [ "cross" != "cross" ]; then
  export JAVAP=" $OUTPUTDIR/jdk/bin/javap  -J-XX:+UseSerialGC -J-Xms32M -J-Xmx512M -J-XX:TieredStopAtLevel=1"
  export JIMAGE=" $OUTPUTDIR/jdk/bin/jimage"
  export JMOD=" $OUTPUTDIR/jdk/bin/jmod"
elif [ "true" = "true" ]; then
  export JAVAP=" $OUTPUTDIR/buildjdk/jdk/bin/javap  -J-XX:+UseSerialGC -J-Xms32M -J-Xmx512M -J-XX:TieredStopAtLevel=1"
  export JIMAGE=" $OUTPUTDIR/buildjdk/jdk/bin/jimage"
  export JMOD=" $OUTPUTDIR/buildjdk/jdk/bin/jmod"
else
  export JAVAP=" $(BUILDJDK_OUTPUTDIR)/jdk/bin/javap  -J-XX:+UseSerialGC -J-Xms32M -J-Xmx512M -J-XX:TieredStopAtLevel=1"
  export JIMAGE=" $(BUILDJDK_OUTPUTDIR)/jdk/bin/jimage"
  export JMOD=" $(BUILDJDK_OUTPUTDIR)/jdk/bin/jmod"
fi

if [ "$OPENJDK_TARGET_OS" = "windows" ]; then
  if [[ $OPENJDK_BUILD_OS_ENV =~ ^windows.wsl ]]; then
    export WSLENV=PATH/l
  fi
  export PATH="$PATH:"
fi

export USE_PRECOMPILED_HEADER="false"

# Now locate the main script and run it.
REAL_COMPARE_SCRIPT="$TOPDIR/make/scripts/compare.sh"
if [ ! -e "$REAL_COMPARE_SCRIPT" ]; then
  echo "Error: Cannot locate compare script, it should have been in $REAL_COMPARE_SCRIPT"
  exit 1
fi

# Rotate logs
$RM $OUTPUTDIR/compare.log.old 2> /dev/null
$MV $OUTPUTDIR/compare.log $OUTPUTDIR/compare.log.old 2> /dev/null

export SCRIPT_DIR="$( cd "$( dirname "$0" )" > /dev/null && pwd )"

$BASH $TOPDIR/make/scripts/logger.sh $OUTPUTDIR/compare.log $BASH "$REAL_COMPARE_SCRIPT" "$@"
