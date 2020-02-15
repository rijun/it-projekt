#!/usr/bin/zsh

cd "${0%/*}" || exit

response=$(curl --write-out "%{http_code}\n" --silent --head --output /dev/null http://localhost:5000)
run_no=$((${$(sed -n '1p' log.txt): -1}+1))
logs=$(sed '1,2d' log.txt)

echo "No. of runs: ${run_no}" > log.txt
echo "--------------------------------------------------" >> log.txt

if [ "$response" -ne "200" ]
  then
  echo "Error code ${response} --> $(date)" >> log.txt
fi

echo "${logs}" >> log.txt